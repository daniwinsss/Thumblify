import { Request, Response } from 'express';
import Thumbnail from '../models/Thumbnail';
import path from 'node:path';
import fs from 'fs';
import axios from 'axios';
import cloudinary from '../configs/cloudinary';
import { stylePrompts, colorSchemeDescriptions } from '../configs/prompts';

export const generateThumbnail = async (req: Request, res: Response) => {
    let thumbnail: any = null;
    try {
        const { userId } = req.session as { userId?: string };

        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const {
            title,
            prompt: user_prompt,
            style,
            aspect_ratio,
            color_scheme,
            text_overlay,
        } = req.body;

        // Normalize userId to ensure consistent string format
        const normalizedUserId = String(userId).trim();
        console.log(`[DEBUG] Creating thumbnail for userId: ${normalizedUserId} (type: ${typeof normalizedUserId}), title: ${title}`);
        thumbnail = await Thumbnail.create({
            userId: normalizedUserId,
            title,
            prompt_used: user_prompt,
            user_prompt,
            style,
            aspect_ratio,
            color_scheme,
            text_overlay,
            isGenerating: true,
            image_url: "",
        });

        console.log(`[DEBUG] Thumbnail created with _id: ${thumbnail._id}, userId: ${thumbnail.userId} (type: ${typeof thumbnail.userId})`);

        // Build the prompt
        let prompt = `Create a ${stylePrompts[style as keyof typeof stylePrompts]} for: "${title}".`;

        if (color_scheme) {
            prompt += ` Use a ${colorSchemeDescriptions[color_scheme as keyof typeof colorSchemeDescriptions]} color scheme.`;
        }

        if (user_prompt) {
            prompt += ` Additional details: ${user_prompt}.`;
        }
        prompt += ` The thumbnail should be ${aspect_ratio}, visually stunning, and designed to maximize click-through rate. Make it bold, professional, and impossible to ignore.`;

        // Use Clipdrop API to generate an image
        const clipdropApiKey = process.env.CLIPDROP_API_KEY;
        if (!clipdropApiKey) {
            throw new Error('Missing Clipdrop API key in environment (set CLIPDROP_API_KEY)');
        }

        console.log(`Making request to Clipdrop API with prompt: ${prompt.substring(0, 100)}...`);

        try {
            // Clipdrop text-to-image API endpoint
            const clipdropUrl = 'https://clipdrop-api.co/text-to-image/v1';

            const response = await axios.post(
                clipdropUrl,
                {
                    prompt: prompt,
                },
                {
                    headers: {
                        'x-api-key': clipdropApiKey,
                        'Content-Type': 'application/json',
                    },
                    responseType: 'arraybuffer',
                    timeout: 120000,
                }
            );

            console.log(`Clipdrop API response status: ${response.status}`);
            console.log(`Received image data, size: ${response.data.byteLength} bytes`);

            // Validate that we got actual image data
            if (!response.data || response.data.byteLength === 0) {
                console.error('Clipdrop returned empty response');
                thumbnail.isGenerating = false;
                await thumbnail.save();
                return res.status(500).json({
                    message: 'Received empty image data from Clipdrop API',
                    thumbnail
                });
            }

            const finalBuffer = Buffer.from(response.data);
            console.log(`[DEBUG] Received image data from Clipdrop, size: ${finalBuffer.length} bytes`);

            // Validate image data
            if (finalBuffer.length < 1000) {
                console.error('[ERROR] Image data too small, likely corrupted');
                thumbnail.isGenerating = false;
                await thumbnail.save();
                return res.status(500).json({
                    message: 'Generated image data appears to be corrupted (too small)',
                    thumbnail
                });
            }

            // Save image to file
            const filename = `final-output-${Date.now()}.png`;
            const filePath = path.join(process.cwd(), 'server', 'images', filename);
            const imagesDir = path.join(process.cwd(), 'server', 'images');

            // Ensure images directory exists
            if (!fs.existsSync(imagesDir)) {
                fs.mkdirSync(imagesDir, { recursive: true });
                console.log(`[DEBUG] Created images directory: ${imagesDir}`);
            }

            fs.writeFileSync(filePath, finalBuffer);
            console.log(`[DEBUG] Image saved to local file: ${filePath}`);

            // Verify file was written correctly
            if (!fs.existsSync(filePath)) {
                console.error('[ERROR] Failed to write image file to disk');
                thumbnail.isGenerating = false;
                await thumbnail.save();
                return res.status(500).json({
                    message: 'Failed to save image to local storage',
                    thumbnail
                });
            }

            const fileStats = fs.statSync(filePath);
            console.log(`[DEBUG] File written successfully, size: ${fileStats.size} bytes`);

            // Validate Cloudinary configuration before upload
            const cloudinaryConfig = cloudinary.config();
            console.log('[DEBUG] Cloudinary config check:', {
                hasCloudName: !!cloudinaryConfig.cloud_name,
                hasApiKey: !!cloudinaryConfig.api_key,
                hasApiSecret: !!cloudinaryConfig.api_secret,
                cloudName: cloudinaryConfig.cloud_name
            });

            if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
                console.error('[ERROR] Cloudinary configuration is incomplete. Check CLOUDINARY_URL format.');
                console.error('[ERROR] Expected format: cloudinary://api_key:api_secret@cloud_name');
                console.error('[ERROR] Current CLOUDINARY_URL:', process.env.CLOUDINARY_URL ? 'present' : 'missing');

                try {
                    fs.unlinkSync(filePath);
                } catch (unlinkError) {
                    console.error('Failed to delete local file:', unlinkError);
                }
                thumbnail.isGenerating = false;
                await thumbnail.save();
                throw new Error('Cloudinary configuration is incomplete. Please check your CLOUDINARY_URL environment variable format: cloudinary://api_key:api_secret@cloud_name');
            }

            // Upload to Cloudinary with retry logic
            let uploadResult;
            const maxRetries = 3;
            let retryCount = 0;

            while (retryCount < maxRetries) {
                try {
                    console.log(`[DEBUG] Starting Cloudinary upload attempt ${retryCount + 1}/${maxRetries} for thumbnail ${thumbnail._id}...`);

                    uploadResult = await cloudinary.uploader.upload(filePath, {
                        resource_type: 'image',
                        folder: 'thumbnails',
                        timeout: 60000,
                        use_filename: true,
                        unique_filename: true,
                    });

                    console.log(`[DEBUG] Cloudinary upload successful on attempt ${retryCount + 1}:`, {
                        url: uploadResult.url,
                        public_id: uploadResult.public_id,
                        secure_url: uploadResult.secure_url,
                        width: uploadResult.width,
                        height: uploadResult.height,
                        bytes: uploadResult.bytes
                    });

                    // Validate that we got a valid URL
                    if (!uploadResult.url && !uploadResult.secure_url) {
                        throw new Error('Cloudinary upload succeeded but no URL was returned');
                    }

                    break; // Success, exit retry loop

                } catch (cloudinaryError: any) {
                    retryCount++;
                    console.error(`[ERROR] Cloudinary upload attempt ${retryCount} failed:`, {
                        message: cloudinaryError?.message,
                        http_code: cloudinaryError?.http_code,
                        name: cloudinaryError?.name,
                        error: cloudinaryError?.error?.message
                    });

                    if (retryCount >= maxRetries) {
                        // Final attempt failed, clean up and throw error
                        try {
                            fs.unlinkSync(filePath);
                            console.log(`[DEBUG] Local file deleted after failed upload: ${filePath}`);
                        } catch (unlinkError) {
                            console.error('Failed to delete local file:', unlinkError);
                        }
                        thumbnail.isGenerating = false;
                        await thumbnail.save();
                        throw new Error(`Cloudinary upload failed after ${maxRetries} attempts: ${cloudinaryError?.message || cloudinaryError?.http_code || 'Unknown error'}. Please check your Cloudinary configuration and network connection.`);
                    }

                    // Wait before retry (exponential backoff)
                    const waitTime = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
                    console.log(`[DEBUG] Waiting ${waitTime}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }

            // Use secure_url if available, otherwise fallback to url
            const imageUrl = uploadResult.secure_url || uploadResult.url;
            if (!imageUrl) {
                throw new Error('Cloudinary upload succeeded but no image URL is available');
            }

            thumbnail.image_url = imageUrl;
            thumbnail.isGenerating = false;
            console.log(`[DEBUG] Thumbnail image_url set to: ${imageUrl}`);

            // Save thumbnail and verify it was saved successfully
            try {
                await thumbnail.save();
                console.log(`[SUCCESS] Thumbnail saved successfully: ${thumbnail._id}, image_url: ${thumbnail.image_url}`);

                // Refetch to ensure we have the latest version from database
                const savedThumbnail = await Thumbnail.findById(thumbnail._id);
                if (!savedThumbnail) {
                    throw new Error('Failed to retrieve saved thumbnail');
                }

                console.log(`[SUCCESS] Refetched thumbnail from DB:`, {
                    _id: savedThumbnail._id,
                    image_url: savedThumbnail.image_url,
                    isGenerating: savedThumbnail.isGenerating,
                    title: savedThumbnail.title
                });

                res.json({
                    message: 'Thumbnail generated successfully',
                    thumbnail: savedThumbnail,
                    debug: {
                        imageUrl: savedThumbnail.image_url,
                        isGenerating: savedThumbnail.isGenerating,
                        hasImageUrl: !!(savedThumbnail.image_url && savedThumbnail.image_url.trim() !== '')
                    }
                });
            } catch (saveError: any) {
                console.error('[ERROR] Failed to save thumbnail:', saveError);
                thumbnail.isGenerating = false;
                await thumbnail.save().catch(() => { });
                throw new Error(`Failed to save thumbnail: ${saveError?.message || 'Unknown error'}`);
            }

            // Clean up local file
            try {
                fs.unlinkSync(filePath);
                console.log(`[DEBUG] Local file deleted: ${filePath}`);
            } catch (unlinkError) {
                console.error('Failed to delete local file:', unlinkError);
            }
            return;

        } catch (clipdropError: any) {
            // Handle Clipdrop API specific errors
            console.error('Clipdrop API error:', clipdropError?.response?.status, clipdropError?.response?.data);
            console.error('STATUS:', clipdropError?.response?.status);

            // Try to get error message from response
            let errorMessage = 'Image generation failed';
            if (clipdropError?.response?.data) {
                try {
                    if (Buffer.isBuffer(clipdropError.response.data)) {
                        errorMessage = clipdropError.response.data.toString('utf-8').substring(0, 200);
                    } else if (typeof clipdropError.response.data === 'string') {
                        errorMessage = clipdropError.response.data.substring(0, 200);
                    } else {
                        errorMessage = JSON.stringify(clipdropError.response.data).substring(0, 200);
                    }
                } catch (parseError) {
                    errorMessage = 'Failed to parse error response';
                }
            } else {
                errorMessage = clipdropError?.message || 'Image generation failed';
            }

            // Handle specific status codes
            if (clipdropError?.response?.status === 401 || clipdropError?.response?.status === 403) {
                thumbnail.isGenerating = false;
                await thumbnail.save();
                return res.status(500).json({
                    message: 'Invalid or unauthorized Clipdrop API key. Please check your CLIPDROP_API_KEY.',
                    thumbnail
                });
            }

            if (clipdropError?.response?.status === 429) {
                thumbnail.isGenerating = false;
                await thumbnail.save();
                return res.status(429).json({
                    message: 'Rate limit exceeded. Please try again later.',
                    thumbnail
                });
            }

            if (clipdropError?.response?.status === 400) {
                thumbnail.isGenerating = false;
                await thumbnail.save();
                return res.status(400).json({
                    message: `Invalid request: ${errorMessage}`,
                    thumbnail
                });
            }

            if (clipdropError?.response?.status === 402) {
                thumbnail.isGenerating = false;
                await thumbnail.save();
                return res.status(402).json({
                    message: 'Insufficient credits. Please check your Clipdrop account balance.',
                    thumbnail
                });
            }

            thumbnail.isGenerating = false;
            await thumbnail.save();
            return res.status(500).json({
                message: errorMessage,
                thumbnail
            });
        }
    } catch (error: any) {
        console.error('generateThumbnail error:', error);
        const msg = error?.message || 'Internal Server Error';

        // Try to update thumbnail record if it was created
        try {
            if (thumbnail && thumbnail.isGenerating) {
                thumbnail.isGenerating = false;
                await thumbnail.save();
            }
        } catch (updateError) {
            console.error('Failed to update thumbnail on error:', updateError);
        }

        return res.status(500).json({
            message: msg,
            thumbnail: thumbnail || null,
            stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        });
    }
};

// Controllers For Thumbnail Deletion
export const deleteThumbnail = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { userId } = req.session as { userId?: string };

        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        // Normalize userId for consistent comparison
        const normalizedUserId = String(userId).trim();

        // Use findOneAndDelete to match both _id and userId
        const deletedThumbnail = await Thumbnail.findOneAndDelete({
            _id: id,
            userId: normalizedUserId
        });

        if (!deletedThumbnail) {
            return res.status(404).json({ message: 'Thumbnail not found or you do not have permission to delete it' });
        }

        res.json({ message: 'Thumbnail deleted successfully' });
    } catch (error: any) {
        console.error('deleteThumbnail error:', error);
        const msg = error?.message || 'Internal Server Error';
        res.status(500).json({ message: msg, stack: error?.stack });
    }
};

// Test endpoint to verify Cloudinary configuration
export const testCloudinaryConfig = async (req: Request, res: Response) => {
    try {
        const config = cloudinary.config();

        // Test basic configuration
        const configStatus = {
            hasCloudName: !!config.cloud_name,
            hasApiKey: !!config.api_key,
            hasApiSecret: !!config.api_secret,
            cloudName: config.cloud_name,
            apiKey: config.api_key ? `${config.api_key.substring(0, 6)}...` : 'missing'
        };

        console.log('[DEBUG] Cloudinary config test:', configStatus);

        if (!config.cloud_name || !config.api_key || !config.api_secret) {
            return res.status(400).json({
                success: false,
                message: 'Cloudinary configuration incomplete',
                config: configStatus,
                envCheck: {
                    hasCloudinaryUrl: !!process.env.CLOUDINARY_URL
                }
            });
        }

        // Test actual connection by getting account details
        try {
            const result = await cloudinary.api.ping();
            res.json({
                success: true,
                message: 'Cloudinary configuration is working',
                config: configStatus,
                ping: result
            });
        } catch (pingError: any) {
            res.status(500).json({
                success: false,
                message: 'Cloudinary configuration exists but connection failed',
                config: configStatus,
                error: pingError.message
            });
        }

    } catch (error: any) {
        console.error('testCloudinaryConfig error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to test Cloudinary configuration',
            error: error.message
        });
    }
};