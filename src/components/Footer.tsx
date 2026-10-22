import React from 'react';
import { AppRoute } from './Header';

interface FooterProps {
  onNavigate: (route: AppRoute, anchor?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t border-[#DADCE0] bg-[#F5F6F7] mt-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-[#DADCE0]">
          <div className="md:col-span-5">
            <div className="text-lg font-bold tracking-tight text-[#0B3D91]">
              AFTERLIGHT
            </div>
            <p className="mt-2 text-sm text-[#4B5563] max-w-sm leading-relaxed">
              Exploring the universe, one observation at a time.
            </p>
            <p className="mt-4 text-xs text-[#6B7280] leading-relaxed max-w-md">
              Developed for the NASA Space Apps Challenge 2026 (Planet X and SPHEREx).
              Archival references acknowledge NASA, JPL-Caltech, NASA/IPAC Infrared
              Science Archive (IRSA), AllWISE/NEOWISE, 2MASS, ESA Gaia DR3, and CDS
              Strasbourg services.
            </p>
          </div>

          <div className="md:col-span-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#202124]">
              Platform
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href="#home"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('home');
                  }}
                  className="text-[#4B5563] hover:text-[#0B3D91] transition-colors"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="#explore"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('explore');
                  }}
                  className="text-[#4B5563] hover:text-[#0B3D91] transition-colors"
                >
                  Explore
                </a>
              </li>
              <li>
                <a
                  href="#observations"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('observations');
                  }}
                  className="text-[#4B5563] hover:text-[#0B3D91] transition-colors"
                >
                  Observations
                </a>
              </li>
              <li>
                <a
                  href="#discoveries"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('discoveries');
                  }}
                  className="text-[#4B5563] hover:text-[#0B3D91] transition-colors"
                >
                  Discoveries
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#202124]">
              Scientific Integrity
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href="#about"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('about');
                  }}
                  className="text-[#4B5563] hover:text-[#0B3D91] transition-colors"
                >
                  About AFTERLIGHT
                </a>
              </li>
              <li>
                <a
                  href="#data-sources"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('about', 'data-sources');
                  }}
                  className="text-[#4B5563] hover:text-[#0B3D91] transition-colors"
                >
                  Data Sources &amp; APIs
                </a>
              </li>
            </ul>
            <p className="mt-4 text-xs text-[#6B7280] leading-relaxed">
              Candidate detections generated from multi-epoch image comparisons require
              formal astrometric and spectroscopic verification and do not represent
              confirmed discoveries.
            </p>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-[#6B7280]">
          <span>AFTERLIGHT Astronomical Discovery Platform · NASA Space Apps 2026</span>
          <span>Scientific Publication &amp; Research Interface</span>
        </div>
      </div>
    </footer>
  );
};
