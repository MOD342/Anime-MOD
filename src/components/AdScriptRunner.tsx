import React, { useEffect, useRef } from 'react';

interface AdScriptRunnerProps {
  scriptCode: string;
}

export default function AdScriptRunner({ scriptCode }: AdScriptRunnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !scriptCode) return;

    // Clear previous elements
    containerRef.current.innerHTML = '';

    try {
      // Create a document fragment to parse the HTML and extract scripts
      const range = document.createRange();
      const fragment = range.createContextualFragment(scriptCode);

      // Extract scripts
      const scripts = Array.from(fragment.querySelectorAll('script'));

      // Copy other non-script HTML elements to the DOM first
      const nonScripts = Array.from(fragment.childNodes).filter(node => node.nodeName !== 'SCRIPT');
      nonScripts.forEach(node => {
        containerRef.current?.appendChild(node.cloneNode(true));
      });

      // Now manually rebuild and append each script element to force browser compilation & execution
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        
        // Copy all attributes (e.g. src, data-zone, async, defer, type)
        Array.from(oldScript.attributes).forEach(attr => {
          newScript.setAttribute(attr.name, attr.value);
        });

        // Set inner content/inline script source
        newScript.textContent = oldScript.textContent;

        // Append to container
        containerRef.current?.appendChild(newScript);
      });
    } catch (e) {
      console.error("Failed to dynamically evaluate ad script code:", e);
      // Fallback to simple dangerous markup if DOM Range parsing fails
      if (containerRef.current) {
        containerRef.current.innerHTML = scriptCode;
      }
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [scriptCode]);

  return (
    <div 
      ref={containerRef} 
      className="w-full flex flex-col items-center justify-center overflow-x-auto min-h-[60px] text-zinc-100" 
      id="dynamic_ad_script_container"
    />
  );
}
