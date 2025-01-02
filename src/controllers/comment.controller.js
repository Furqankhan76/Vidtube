import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // Validate video ID
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  // Ensure page and limit are valid numbers
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);
  if (
    isNaN(pageNumber) ||
    pageNumber < 1 ||
    isNaN(limitNumber) ||
    limitNumber < 1
  ) {
    throw new ApiError(400, "Invalid pagination parameters");
  }

  // Fetch comments with pagination and sort by creation date (newest first)
  const comments = await Comment.find({ video: videoId })
    .populate("owner", "username avatar") // Populate user details for the comment owner
    .skip((pageNumber - 1) * limitNumber)
    .limit(limitNumber)
    .sort({ createdAt: -1 });

  // Get total comment count for the video
  const totalComments = await Comment.countDocuments({ video: videoId });

  // Create response object
  const response = {
    comments,
    totalComments,
    page: pageNumber,
    limit: limitNumber,
    totalPages: Math.ceil(totalComments / limitNumber),
  };

  return res
    .status(200)
    .json(new ApiResponse(200, response, "Comments fetched successfully"));
});



const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;

  // Validate inputs
  if (!content || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Content and a valid video ID are required");
  }

  // Check if the video exists
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Create a new comment
  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user._id, // Assuming `req.user` contains the logged-in user
  });

  // Add the comment to the video (optional, if you maintain a comments array in the Video model)
  // If the Video model doesn't have a comments array, remove these lines.
  if (!video.comments) video.comments = []; // Ensure comments array exists
  video.comments.push(comment._id);
  await video.save();

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
});



const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  // Validate the inputs
  if (!content || !mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Content and a valid comment ID are required");
  }

  // Find the comment
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  // Check if the user is the owner of the comment
  if (!comment.owner.equals(req.user._id)) {
    throw new ApiError(403, "You are not authorized to update this comment");
  }

  // Update the comment
  comment.content = content;
  await comment.save();

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated successfully"));
});


const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  // Validate the comment ID
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  // Find the comment to delete
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  // Check if the user is the owner of the comment
  if (!comment.owner.equals(req.user._id)) {
    throw new ApiError(403, "You are not authorized to delete this comment");
  }

  // Remove the comment
  await Comment.findByIdAndDelete(commentId);

  // Optionally, remove the comment ID from the associated video's comments array
  await Video.findByIdAndUpdate(comment.video, {
    $pull: { comments: commentId },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});


export { getVideoComments, addComment, updateComment, deleteComment };
