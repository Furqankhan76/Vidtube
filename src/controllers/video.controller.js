import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1, // Default to page 1
    limit = 10, // Default limit per page
    query, // Search query
    sortBy = "createdAt", // Default sort field
    sortType = "desc", // Default sort order (descending)
    userId, // Optional: Filter videos by userId
  } = req.query;

  // Pagination setup
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    customLabels: { docs: "videos" },
  };

  // Initialize aggregation pipeline
  const pipeline = [];

  // 1. Search query filter (title or description match)
  if (query) {
    pipeline.push({
      $match: {
        $or: [
          { title: { $regex: query, $options: "i" } }, // Case-insensitive match for title
          { description: { $regex: query, $options: "i" } }, // Case-insensitive match for description
        ],
      },
    });
  }

  // 2. Filter videos by specific userId (owner)
  if (userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "Invalid user ID");
    }
    pipeline.push({
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    });
  }

  // 3. Sorting (dynamic based on query params)
  pipeline.push({
    $sort: {
      [sortBy]: sortType === "asc" ? 1 : -1, // Ascending: 1, Descending: -1
    },
  });

  // 4. Lookup owner details (to include video owner info)
  pipeline.push({
    $lookup: {
      from: "users", // Assuming the collection name for users is 'users'
      localField: "owner",
      foreignField: "_id",
      as: "owner",
    },
  });

  // 5. Reshape owner details (flattening owner array)
  pipeline.push({
    $addFields: {
      owner: { $arrayElemAt: ["$owner", 0] },
    },
  });

  // 6. Project only required fields
  pipeline.push({
    $project: {
      title: 1,
      description: 1,
      thumbnail: 1,
      videoFile: 1,
      duration: 1,
      createdAt: 1,
      "owner.fullName": 1,
      "owner.username": 1,
      "owner.avatar": 1,
    },
  });

  // Paginate the aggregation
  const videos = await Video.aggregatePaginate(
    Video.aggregate(pipeline),
    options
  );

  // 7. Check if videos exist
  if (!videos || videos.videos.length === 0) {
    res.status(300).json({message: []})
  }

  // Send success response
  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description, duration } = req.body;

  // Validate input fields
  if (!title || !description || !duration) {
    throw new ApiError(400, "Title, description, and duration are required");
  }

  // Check if video and thumbnail files are uploaded
  const videoFile = req.files?.videoFile?.[0]?.path;
  const thumbnailFile = req.files?.thumbnail?.[0]?.path;

  if (!videoFile) {
    throw new ApiError(400, "Video file is required");
  }

  if (!thumbnailFile) {
    throw new ApiError(400, "Thumbnail file is required");
  }

  // Upload the video file and thumbnail to Cloudinary
  const videoUploadResult = await uploadOnCloudinary(videoFile);
  const thumbnailUploadResult = await uploadOnCloudinary(thumbnailFile);

  // Handle any errors during file upload
  if (!videoUploadResult || !thumbnailUploadResult) {
    throw new ApiError(500, "Error uploading files to Cloudinary");
  }

  // Create a new video document in the database
  const newVideo = await Video.create({
    title,
    description,
    videoFile: videoUploadResult.url, // Cloudinary video URL
    videoPublicId: videoUploadResult.public_id, // Cloudinary video publicId
    thumbnail: thumbnailUploadResult.url, // Cloudinary thumbnail URL
    thumbnailPublicId: thumbnailUploadResult.public_id, // Cloudinary thumbnail publicId
    duration, // Duration from the request body
    owner: req.user._id, // The owner is the authenticated user
  });

  // Return response with the created video
  return res
    .status(201)
    .json(new ApiResponse(200, newVideo, "Video published successfully"));
});


const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  // Validate the video ID
  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }

  // Check if the ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid Video ID format");
  }

  // Fetch the video by its ID
  const video = await Video.findById(videoId)
    .populate({
      path: "owner", // Populate the owner field
      select: "fullName username avatar", // Select only specific fields from the owner
    })
    .exec();

  // Check if the video exists
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Return the video details in the response
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});


const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  // Validate the video ID
  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }

  // Check if the ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid Video ID format");
  }

  // Find the video by ID
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Update fields if they are provided
  if (title?.trim()) video.title = title.trim();
  if (description?.trim()) video.description = description.trim();

  // Handle thumbnail upload
  if (req.file) {
    const thumbnailLocalPath = req.file.path;

    // Upload the new thumbnail to Cloudinary
    const uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!uploadedThumbnail || !uploadedThumbnail.url) {
      throw new ApiError(400, "Failed to upload thumbnail");
    }

    // Update the thumbnail field
    video.thumbnail = uploadedThumbnail.url;
  }

  // Save the updated video document
  await video.save();

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video updated successfully"));
});


const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid Video ID format");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Optional: Ensure only the owner can delete the video
  if (req.user._id.toString() !== video.owner.toString()) {
    throw new ApiError(403, "You are not authorized to delete this video");
  }

  // Delete the video from Cloudinary using the stored publicId
  if (video.videoPublicId) {
    const videoDeleteResponse = await deleteFromCloudinary(video.videoPublicId);
    if (!videoDeleteResponse) {
      throw new ApiError(500, "Failed to delete video from Cloudinary");
    }
  }

  // Delete the thumbnail from Cloudinary if it exists
  if (video.thumbnailPublicId) {
    const thumbnailDeleteResponse = await deleteFromCloudinary(
      video.thumbnailPublicId
    );
    if (!thumbnailDeleteResponse) {
      throw new ApiError(500, "Failed to delete thumbnail from Cloudinary");
    }
  }

  // Delete the video from the database
  await Video.findByIdAndDelete(videoId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});



const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  // Validate video ID
  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }

  // Check if videoId is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid Video ID format");
  }

  // Find the video by ID
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Optional: Ensure only the owner can toggle the publish status
  if (req.user._id.toString() !== video.owner.toString()) {
    throw new ApiError(403, "You are not authorized to update this video");
  }

  // Toggle the publish status
  video.isPublished = !video.isPublished;

  // Save the updated video document
  await video.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { video },
        `Video has been ${video.isPublished ? "published" : "unpublished"} successfully`
      )
    );
});


export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
