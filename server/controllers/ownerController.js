import User from "../models/User.js";
import imagekit from "../configs/imageKit.js";
import Car from "../models/Car.js";

export const changeRoleToOwner = async (req, res) => {
    try {
        const { _id } = req.user;
        await User.findByIdAndUpdate(_id, { role: "owner" })
        res.json({ success: true, message: "Now you can list cars" })
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })

    }
}

// API to List Car

export const addCar = async (req, res) => {
    try {
        const { _id } = req.user;
        let car = JSON.parse(req.body.carData);
        const imageFile = req.file;

        // Upload Image to ImageKit    
        const response = await imagekit.files.upload({
            file: imageFile.buffer,
            fileName: imageFile.originalname,
            folder: '/cars'
        })

        // optimization through imagekit URL transformation (v7 API)
        const optimizedImageURL = imagekit.helper.buildSrc({
            urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
            src: response.filePath,
            transformation: [
                { width: '1280' }, // width resizing
                { quality: '80' }, // compression
                { format: 'webp' } // convert to modern format
            ]
        });

        const image = optimizedImageURL;
        await Car.create({ ...car, owner: _id, image })

        res.json({ success: true, message: "Car Added" })

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }

}