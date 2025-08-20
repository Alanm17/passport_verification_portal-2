import React, { useState } from "react";
import Icon from "../AppIcon";
import Button from "./Button";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="bg-card border-b border-border shadow-minimal sticky top-0 z-50">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Logo Section */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
            <Icon name="Shield" size={24} color="white" strokeWidth={2} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-foreground leading-tight">
              Documents Checker
            </h1>
            <span className="text-xs text-muted-foreground font-normal">
              Studify
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          <Button
            variant="ghost"
            className="text-foreground hover:text-primary hover:bg-muted transition-micro"
            onClick={() =>
              (window.location.href = "/document-upload-and-verification")
            }
          >
            Document Verification
          </Button>

          {/* More Menu */}
        </nav>

        {/* User Actions */}
        <div className="flex items-center space-x-3">
          {/* Notifications */}

          {/* User Menu */}
          <div className="flex items-center space-x-2 pl-3 border-l border-border">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Icon name="User" size={16} color="white" />
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-medium text-foreground">CEO</p>
              <p className="text-xs text-muted-foreground">Fayzullo</p>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            iconName="Menu"
            iconSize={20}
            className="md:hidden text-muted-foreground hover:text-primary transition-micro"
            onClick={toggleMenu}
          >
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border bg-card">
          <nav className="px-6 py-4 space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start text-foreground hover:text-primary hover:bg-muted transition-micro"
              onClick={() => {
                window.location.href = "/document-upload-and-verification";
                setIsMenuOpen(false);
              }}
            >
              <Icon name="FileText" size={16} className="mr-2" />
              Document Verification
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start text-foreground hover:text-primary hover:bg-muted transition-micro"
              onClick={() => {
                console.log("Dashboard clicked");
                setIsMenuOpen(false);
              }}
            >
              <Icon name="BarChart3" size={16} className="mr-2" />
              Dashboard
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start text-foreground hover:text-primary hover:bg-muted transition-micro"
              onClick={() => {
                console.log("Reports clicked");
                setIsMenuOpen(false);
              }}
            >
              <Icon name="FileBarChart" size={16} className="mr-2" />
              Reports
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start text-foreground hover:text-primary hover:bg-muted transition-micro"
              onClick={() => {
                console.log("Queue clicked");
                setIsMenuOpen(false);
              }}
            >
              <Icon name="Clock" size={16} className="mr-2" />
              Queue
            </Button>

            <hr className="my-3 border-border" />

            <Button
              variant="ghost"
              className="w-full justify-start text-foreground hover:text-primary hover:bg-muted transition-micro"
              onClick={() => {
                console.log("Settings clicked");
                setIsMenuOpen(false);
              }}
            >
              <Icon name="Settings" size={16} className="mr-2" />
              Settings
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start text-foreground hover:text-primary hover:bg-muted transition-micro"
              onClick={() => {
                console.log("Help clicked");
                setIsMenuOpen(false);
              }}
            >
              <Icon name="HelpCircle" size={16} className="mr-2" />
              Help & Support
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
