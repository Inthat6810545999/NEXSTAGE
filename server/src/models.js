import mongoose from 'mongoose';
const { Schema } = mongoose;
const opts = { timestamps: true, strict: true, versionKey: false };

const cartSchema = new Schema({
  userId: { type: Number, required: true, unique: true, min: 1 },
  items: [{ ticketTypeId: { type: Number, required: true, min: 1 }, quantity: { type: Number, required: true, min: 1, max: 20 }, _id: false }]
}, opts);

const reviewSchema = new Schema({
  userId: { type: Number, required: true, min: 1 },
  eventId: { type: Number, required: true, min: 1 },
  rating: { type: Number, required: true, min: 1, max: 5 },
  text: { type: String, required: true, maxlength: 1500, trim: true }
}, opts);
reviewSchema.index({ userId: 1, eventId: 1 }, { unique: true });

const wishlistSchema = new Schema({
  userId: { type: Number, required: true, unique: true, min: 1 },
  eventIds: [{ type: Number, min: 1 }]
}, opts);

const notificationSchema = new Schema({
  userId: { type: Number, required: true, min: 1 },
  title: { type: String, required: true, maxlength: 150 },
  message: { type: String, required: true, maxlength: 600 },
  type: { type: String, enum: ['booking', 'system', 'promotion'], default: 'system' },
  isRead: { type: Boolean, default: false },
  dedupeKey: { type: String, sparse: true, unique: true }
}, opts);

export const Cart = mongoose.model('Cart', cartSchema, 'carts');
export const Review = mongoose.model('Review', reviewSchema, 'reviews');
export const Wishlist = mongoose.model('Wishlist', wishlistSchema, 'wishlists');
export const Notification = mongoose.model('Notification', notificationSchema, 'notifications');

export const collections = { carts: Cart, reviews: Review, wishlists: Wishlist, notifications: Notification };
