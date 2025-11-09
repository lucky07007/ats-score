/** @type {import('next').NextConfig} */
const nextConfig = {
  // CRITICAL: This is the fix for the 413 error
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Ensure this is set to 10mb or higher
    },
  },
};

export default nextConfig;
