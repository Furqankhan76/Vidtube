import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import {Video} from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Tweet } from "../models/tweet.model.js";
import { Comment } from "../models/comment.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  // Check if the provided videoId is valid
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  // Fetch the video from the database
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const userId = req.user._id;

  // Check if the user already liked the video in the Video model
  const alreadyLiked = video.likes.includes(userId);

  if (alreadyLiked) {
    // If already liked, remove from the likes array and delete from Like model
    video.likes = video.likes.filter(
      (like) => like.toString() !== userId.toString()
    );

    await Like.findOneAndDelete({ likedBy: userId, video: videoId });
  } else {
    // If not liked, add to the likes array and create a new Like document
    video.likes.push(userId);

    await Like.create({
      likedBy: userId,
      video: videoId,
    });
  }

  // Save the updated video
  await video.save();

  // Get the updated likes count from the Like model
  const likesCount = await Like.countDocuments({ video: videoId });

  // Return success response with updated like count and like status
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videoId: video._id,
        likesCount: likesCount,
        userLiked: !alreadyLiked,
      },
      `Video has been ${alreadyLiked ? "unliked" : "liked"} successfully`
    )
  );
});






const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "User not authenticated");
  }

  // Find the comment by ID
  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  // Check if the user has already liked the comment
  const alreadyLiked = comment.likes.includes(userId);

  if (alreadyLiked) {
    // If liked, remove the like
    comment.likes = comment.likes.filter(
      (id) => id.toString() !== userId.toString()
    );
  } else {
    // If not liked, add the like
    comment.likes.push(userId);
  }

  // Save the updated comment
  await comment.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { likes: comment.likes.length },
        "Like toggled successfully"
      )
    );
});


const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const userId = req.user._id; // Assuming `req.user` contains the logged-in user info

  // Validate tweetId
  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  // Check if the tweet exists
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  // Check if the user already liked the tweet
  const existingLike = await Like.findOne({ tweet: tweetId, likedBy: userId });

  if (existingLike) {
    // If liked, remove the like
    await existingLike.remove();
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Like removed from tweet"));
  } else {
    // If not liked, add a new like
    const like = await Like.create({ tweet: tweetId, likedBy: userId });
    return res
      .status(201)
      .json(new ApiResponse(201, like, "Like added to tweet"));
  }
});


const getLikedVideos = asyncHandler(async (req, res) => {
  const { _id: userId } = req.user; // Get the current user's ID from the JWT payload

  // Fetch all videos where the current user is in the 'likes' array
  const likedVideos = await Video.find({ likes: userId })
    .populate("owner", "fullName username avatar") // Populate owner details for each video
    .select("title thumbnail videoFile duration likes createdAt") // Select the necessary fields for the video
    .exec();

  // Check if any liked videos were found
  if (likedVideos.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "No liked videos found"));
  }

  // Send success response with the list of liked videos
  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    );
});



export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
