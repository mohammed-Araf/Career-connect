"use client";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, UserCircle, Briefcase, Menu } from 'lucide-react';
import { siteConfig } from '@/config/site';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState, useEffect } from 'react';


export function SiteHeader() {
  const { user, logout, loading } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);


  const commonLinks = (
    <>
      {isClient && !loading && user && (
        <>
          {/* Profile link/button for job-seekers */}
          {user.role === 'job-seeker' && (
            <Button variant="ghost" asChild size="sm" onClick={() => setMobileMenuOpen(false)}>
              <Link href="/dashboard/job-seeker/my-profile" aria-label="My Profile">
                <UserCircle className="h-4 w-4 mr-1 sm:mr-0" /> <span className="sm:hidden">Profile</span>
              </Link>
            </Button>
          )}
          {/* Display user email and role if not a job-seeker or for other general display */}
          {user.role !== 'job-seeker' && (
             <span className="text-sm text-muted-foreground px-2 py-1 sm:px-0 sm:py-0">
              {user.email} ({user.role})
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={() => { logout(); setMobileMenuOpen(false); }} aria-label="Logout">
            <LogOut className="h-4 w-4 mr-1 sm:mr-0" /> <span className="sm:hidden">Logout</span>
          </Button>
        </>
      )}
      {isClient && !loading && !user && (
          <>
            <Button variant="ghost" asChild size="sm" onClick={() => setMobileMenuOpen(false)}>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild size="sm" onClick={() => setMobileMenuOpen(false)}>
              <Link href="/signup">Sign Up</Link>
            </Button>
          </>
        )}
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm backdrop-blur-md bg-opacity-80">
      <div className="container flex h-16 items-center">
        <Link href={user ? "/dashboard" : "/login"} className="flex items-center space-x-2 text-primary hover:text-primary/90 transition-colors mr-auto">
          <Briefcase className="h-7 w-7" />
          <span className="font-bold text-xl">{siteConfig.name}</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-2">
          {commonLinks}
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] pt-10">
              <nav className="flex flex-col space-y-4">
                {commonLinks}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
