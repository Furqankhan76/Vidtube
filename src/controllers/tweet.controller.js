import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  const { content, replyTo } = req.body;

  // Validate content
  if (!content || content.trim() === "") {
    throw new ApiError(400, "Tweet content cannot be empty");
  }

  // Create a new tweet
  const tweet = await Tweet.create({
    content: content.trim(),
    owner: req.user?._id, // Assuming the logged-in user's ID is available in req.user
    replyTo: replyTo || null, // If replyTo is provided, set it; otherwise, null
  });

  // Populate owner details in response if needed
  const populatedTweet = await tweet.populate(
    "owner",
    "username avatar fullName"
  );

  return res
    .status(201)
    .json(new ApiResponse(201, populatedTweet, "Tweet created successfully"));
});



const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Validate the userId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  // Fetch the tweets associated with the userId
  const tweets = await Tweet.find({ owner: userId }).sort({ createdAt: -1 });

  if (!tweets.length) {
    throw new ApiError(404, "No tweets found for this user");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "User tweets fetched successfully"));
});


const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  // Validate the tweetId
  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  // Fetch the tweet to ensure it exists and the current user is the owner
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  // Check if the authenticated user is the owner of the tweet
  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this tweet");
  }

  // Delete the tweet
  await Tweet.findByIdAndDelete(tweetId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet deleted successfully"));
});


export { createTweet, getUserTweets, updateTweet, deleteTweet };
