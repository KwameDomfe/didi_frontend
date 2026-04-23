import { useState } from 'react';
import Logo from './Logo';
import MenuIcon from './MenuIcon';
import DesktopNav from './DesktopNav';
import MobileMenu from './MobileMenu';

const MainHeader = () => {
    
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <header className="h-100 w-100 z-5 bg-brown0"
            style={{ overflow: 'visible' }}
        >
            <div className="flex justify-between items-center 
                container container90 h4-00 w-100"
                style={{ overflow: 'visible' }}
            >
                <div className="flex justify-between items-center w-100 h-100"
                    style={{ overflow: 'visible' }}
                >
                    {/* Logo */}
                    <Logo />    
                    
                    {/* Mobile Menu Button */}
                    <MenuIcon
                        isOpen={isMobileMenuOpen}
                        onClick={() => setIsMobileMenuOpen(prev => !prev)}
                    />

                    {/* Desktop Navigation */}
                    <DesktopNav />

                </div>
               
            </div>
            {/* Mobile Offcanvas Menu */}
            <MobileMenu isOpen={isMobileMenuOpen} 
                onClose={() => setIsMobileMenuOpen(false)} 
            />
        </header>
    );
};

export default MainHeader;