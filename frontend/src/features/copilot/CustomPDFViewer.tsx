import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface CustomPDFViewerProps {
  url: string;
  zoom: number;
  page: number; // Requested page to scroll to (from citation or top nav)
  onPageChange: (page: number) => void;
  navCounter: number; // Increment to force a jump to `page`
}

export const CustomPDFViewer: React.FC<CustomPDFViewerProps> = ({ 
  url, 
  zoom, 
  page, 
  onPageChange, 
  navCounter 
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isJumping = useRef<boolean>(false);

  // When navCounter changes (which means citation or toolbar was clicked), scroll to that page
  useEffect(() => {
    if (pageRefs.current[page]) {
      isJumping.current = true;
      pageRefs.current[page]?.scrollIntoView({ behavior: 'auto', block: 'start' });
      // Reset the jump flag shortly after so manual scrolling resumes updates
      setTimeout(() => { isJumping.current = false; }, 300);
    }
  }, [navCounter, page]);

  // Setup intersection observer to track which page is mostly on screen
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver((entries) => {
      // Don't report scroll updates if we're in the middle of a programatic jump
      if (isJumping.current) return;
      
      let maxRatio = 0;
      let mostVisiblePage = -1;

      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
           maxRatio = entry.intersectionRatio;
           const pg = parseInt(entry.target.getAttribute('data-page-number') || '1');
           mostVisiblePage = pg;
        }
      });

      if (mostVisiblePage !== -1) {
        onPageChange(mostVisiblePage);
      }
    }, {
      root: container,
      threshold: [0.1, 0.3, 0.5, 0.7, 0.9] 
    });

    pageRefs.current.forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [numPages, onPageChange]);

  const onDocumentLoadSuccess = ({ numPages: nextNumPages }: { numPages: number }) => {
    setNumPages(nextNumPages);
    // Initial scroll
    setTimeout(() => {
       isJumping.current = true;
       pageRefs.current[page]?.scrollIntoView({ behavior: 'auto', block: 'start' });
       setTimeout(() => { isJumping.current = false; }, 300);
    }, 100);
  };

  return (
    <div ref={containerRef} className="w-full h-full overflow-auto bg-[#F1F5F9] flex flex-col items-center pt-8 pb-12 relative">
      <Document 
        file={url} 
        onLoadSuccess={onDocumentLoadSuccess} 
        loading={<div className="p-12 text-gray-500 font-medium">Loading document...</div>}
      >
        {Array.from(new Array(numPages), (el, index) => (
          <div 
            key={`page_${index + 1}`} 
            ref={el => pageRefs.current[index + 1] = el}
            data-page-number={index + 1}
            className="mb-6 shadow-sm bg-white"
          >
            <Page 
              pageNumber={index + 1} 
              scale={zoom / 100}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              width={800} // Base width which gets scaled
            />
          </div>
        ))}
      </Document>
    </div>
  );
};
