import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  // Validate channelId
  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  // Check if the channel exists
  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  const subscriberId = req.user._id;

  // Check if subscription already exists
  const existingSubscription = await Subscription.findOne({
    subscriber: subscriberId,
    channel: channelId,
  });

  if (existingSubscription) {
    // If subscription exists, remove it (unsubscribe)
    await Subscription.deleteOne({ _id: existingSubscription._id });

    return res
      .status(200)
      .json(
        new ApiResponse(200, {}, "Successfully unsubscribed from the channel")
      );
  } else {
    // If subscription doesn't exist, create it (subscribe)
    const newSubscription = await Subscription.create({
      subscriber: subscriberId,
      channel: channelId,
    });

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          newSubscription,
          "Successfully subscribed to the channel"
        )
      );
  }
});


// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  // Validate channelId
  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  // Check if the channel exists
  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  // Get the list of subscribers for the given channel
  const subscriptions = await Subscription.find({ channel: channelId })
    .populate("subscriber", "username fullName avatar") // Include subscriber details
    .exec();

  const subscribers = subscriptions.map((sub) => sub.subscriber);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribers,
        "Channel subscribers fetched successfully"
      )
    );
});


// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const subscriberId = req.user._id; // Get the logged-in user's ID from req.user

  // Validate subscriberId
  if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
    throw new ApiError(400, "Invalid subscriber ID");
  }

  // Check if the subscriber exists
  const subscriber = await User.findById(subscriberId);
  if (!subscriber) {
    throw new ApiError(404, "Subscriber not found");
  }

  // Get the list of channels the subscriber is subscribed to
  const subscriptions = await Subscription.find({ subscriber: subscriberId })
    .populate("channel", "username fullName avatar") // Include channel details
    .exec();

  const subscribedChannels = subscriptions.map((sub) => sub.channel);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribedChannels,
        "Subscribed channels fetched successfully"
      )
    );
});


export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
