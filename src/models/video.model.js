import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
  {
    videoFile: {
      type: String, // Cloudinary URL for the video file
      required: true,
    },
    videoPublicId: {
      type: String, // Cloudinary publicId for the video file
      required: true,
    },
    thumbnail: {
      type: String, // Cloudinary URL for the thumbnail
      required: true,
    },
    thumbnailPublicId: {
      type: String, // Cloudinary publicId for the thumbnail
      required: true,
    },
    title: {
      type: String,
      required: true,
      minLength: 3,
      maxLength: 100,
    },
    description: {
      type: String,
      required: true,
      minLength: 10,
      maxLength: 5000,
    },
    duration: {
      type: Number,
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User", // Stores IDs of users who liked the video
      },
    ],
    comments: [
      {
        type: Schema.Types.ObjectId,
        ref: "Comment", // Stores IDs of comments
      },
    ],
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
