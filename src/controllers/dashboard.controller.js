import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const channelId = req.user._id; // Assuming the logged-in user's ID is used as the channel ID

  // Validate channelId
  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  // Check if the channel exists
  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  // Fetch total videos by the channel
  const totalVideos = await Video.countDocuments({ owner: channelId });

  // Fetch total views for all videos by the channel
  const totalViews = await Video.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(channelId) } },
    { $group: { _id: null, totalViews: { $sum: "$views" } } },
  ]);

  // Fetch total subscribers for the channel
  const totalSubscribers = await Subscription.countDocuments({
    channel: channelId,
  });

  // Fetch total likes for all videos by the channel
  const totalLikes = await Like.countDocuments({
    video: { $in: await Video.find({ owner: channelId }).distinct("_id") },
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalVideos,
        totalViews: totalViews.length ? totalViews[0].totalViews : 0,
        totalSubscribers,
        totalLikes,
      },
      "Channel stats fetched successfully"
    )
  );
});


const getChannelVideos = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  // Check if the provided channelId is valid
  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  // Check if the channel exists
  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  // Fetch all videos uploaded by this channel
  const videos = await Video.find({ owner: channelId })
    .sort({ createdAt: -1 }) // Sort videos by creation date (newest first)
    .select("title thumbnail videoFile duration likes createdAt") // Select only necessary fields
    .exec();

  // Check if any videos are found
  if (videos.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "No videos found for this channel"));
  }

  // Return the list of videos
  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Channel videos fetched successfully"));
});


export { getChannelStats, getChannelVideos };
