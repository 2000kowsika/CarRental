import "dotenv/config";
import ImageKit from "@imagekit/nodejs";

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

// Helper for building optimized ImageKit URLs
imagekit.url = ({ path, src, transformation }) => {
    const fullSrc = src || `${process.env.IMAGEKIT_URL_ENDPOINT}${path.startsWith('/') ? '' : '/'}${path}`;
    return imagekit.helper.buildSrc({
        src: fullSrc,
        transformation
    });
};

export default imagekit;
