/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add this section to increase the body parser limit
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Set the limit to 10MB (or higher if needed)
    },
  },
  
  // Standard Next.js configuration
  webpack: (config) => {
    // This setting ensures your Next.js pages build correctly
    config.resolve.extensionAlias = {
      ".js": [".js", ".jsx", ".ts", ".tsx"],
      ".mjs": [".mjs"],
    };
    return config;
  },
};

export default nextConfig;
