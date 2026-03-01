"use client";

import React, { useEffect } from "react";

interface DevfolioButtonProps {
  hackathonSlug?: string;
  buttonTheme?: "light" | "dark" | "dark-inverted";
  width?: number;
  height?: number;
}

/**
 * "Apply with Devfolio" button integration.
 * Loads the Devfolio SDK script dynamically and renders the button container.
 * @see https://guide.devfolio.co/docs/guide/apply-with-devfolio-integration
 */
const DevfolioButton: React.FC<DevfolioButtonProps> = ({
  hackathonSlug = "indianext",
  buttonTheme = "dark-inverted",
  width = 312,
  height = 44,
}) => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://apply.devfolio.co/v2/sdk.js";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div
      className="apply-button"
      data-hackathon-slug={hackathonSlug}
      data-button-theme={buttonTheme}
      style={{
        height: `${height}px`,
        width: `${width}px`,
        minHeight: `${height}px`,
      }}
    />
  );
};

export default DevfolioButton;
