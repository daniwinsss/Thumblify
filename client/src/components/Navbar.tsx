import { Menu, X, LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { isLoggedIn, user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  const handleLogout = async () => {
    await logout();
    setIsProfileMenuOpen(false);
    navigate("/");
  };

  const handleContactClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (location.pathname !== "/") {
      navigate("/#contact");
    } else {
      const contactSection = document.getElementById("contact");
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const handleMobileContactClick = () => {
    setIsOpen(false);
    if (location.pathname !== "/") {
      navigate("/#contact");
    } else {
      const contactSection = document.getElementById("contact");
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <>
      <motion.nav
        className="fixed top-0 left-0 z-[999] w-full bg-black/50 backdrop-blur-md px-6 py-4"
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.svg" className="h-8" alt="Thumbify logo" />
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-white hover:text-pink-500 transition">
              Home
            </Link>
            <Link to="/generate" className="text-white hover:text-pink-500 transition">
              Generate
            </Link>
            <Link to="/my-generation" className="text-white hover:text-pink-500 transition">
              My Generations
            </Link>
            <a 
              href="/#contact" 
              onClick={handleContactClick}
              className="text-white hover:text-pink-500 transition"
            >
              Contact us
            </a>
          </div>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <div className="relative" ref={profileMenuRef}>
                <button 
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="size-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white font-semibold hover:bg-white/30 transition cursor-pointer"
                >
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </button>
                
                {/* Profile Dropdown Menu */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-black/90 backdrop-blur-md border border-white/10 rounded-lg shadow-lg overflow-hidden z-[1001]">
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="text-white text-sm font-semibold">{user?.name || "User"}</p>
                      <p className="text-gray-400 text-xs truncate">{user?.email || ""}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition flex items-center gap-2"
                    >
                      <LogOut className="size-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="hidden md:block px-6 py-2 bg-pink-600 rounded-full text-white hover:bg-pink-700 transition"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="hidden md:block px-6 py-2 border border-white/30 rounded-full text-white hover:bg-white/10 transition"
                >
                  Get Started
                </button>
              </>
            )}

            <button className="md:hidden" onClick={() => setIsOpen(true)}>
              <Menu className="text-white" />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/80 flex flex-col items-center justify-center gap-6 md:hidden">
          <Link 
            onClick={() => setIsOpen(false)} 
            to="/"
            className="text-white text-lg hover:text-pink-500 transition"
          >
            Home
          </Link>
          <Link 
            onClick={() => setIsOpen(false)} 
            to="/generate"
            className="text-white text-lg hover:text-pink-500 transition"
          >
            Generate
          </Link>
          <Link 
            onClick={() => setIsOpen(false)} 
            to="/my-generation"
            className="text-white text-lg hover:text-pink-500 transition"
          >
            My Generations
          </Link>
          <button
            onClick={handleMobileContactClick}
            className="text-white text-lg hover:text-pink-500 transition"
          >
            Contact us
          </button>

          {!isLoggedIn && (
            <button
              onClick={() => {
                setIsOpen(false);
                navigate("/login");
              }}
              className="px-6 py-2 bg-pink-600 rounded-full text-white hover:bg-pink-700 transition"
            >
              Sign In
            </button>
          )}

          {isLoggedIn && (
            <button
              onClick={async () => {
                setIsOpen(false);
                await handleLogout();
              }}
              className="px-6 py-2 border border-white/30 rounded-full text-white hover:bg-white/10 transition flex items-center gap-2"
            >
              <LogOut className="size-4" />
              <span>Logout</span>
            </button>
          )}

          <button
            onClick={() => setIsOpen(false)}
            className="mt-6 bg-pink-600 p-2 rounded text-white"
          >
            <X />
          </button>
        </div>
      )}
    </>
  );
}
// console.log("Navbar mounted");