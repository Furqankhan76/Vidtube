import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (
  localFilePath,
  // folderName = "default-folder"
) => {
  try {
    if (!localFilePath) return null;

    // Generate a unique publicId using a combination of folder and UUID
    const publicId = `$${uuidv4()}`;

    // Upload the file to Cloudinary with the unique publicId
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto", // Allows both videos and images
      public_id: publicId,
    });

    // File has been uploaded successfully
    console.log("File is uploaded on Cloudinary with publicId:", publicId);
    fs.unlinkSync(localFilePath); // Remove the temporary file from the local system
    return response;
  } catch (error) {
    console.error("Error uploading file to Cloudinary:", error);
    fs.unlinkSync(localFilePath); // Remove the locally saved temporary file if upload fails
    return null;
  }
};

const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;

    // Delete the file from Cloudinary
    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: "video", // Use "video" for video resources
    });

    console.log("File deleted from Cloudinary:", response);
    return response;
  } catch (error) {
    console.error("Error deleting file from Cloudinary:", error);
    return null;
  }
};

const deleteImageFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;

    // Delete the file from Cloudinary
    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image", // Use "video" for video resources
    });

    console.log("File deleted from Cloudinary:", response);
    return response;
  } catch (error) {
    console.error("Error deleting file from Cloudinary:", error);
    return null;
  }
};




export { uploadOnCloudinary, deleteFromCloudinary, deleteImageFromCloudinary};
