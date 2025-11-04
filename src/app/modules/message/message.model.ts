import mongoose from "mongoose";
import { IMessage } from "./message.interface";

const messageSchema = new mongoose.Schema<IMessage>(
    {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        message: { type: String, required: true },
        file: { type: String },
    },
    { timestamps: true }
);


const Message = mongoose.model<IMessage>("Message", messageSchema);
export default Message;
