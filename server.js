const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const app = express();
const server = http.createServer(app);
const io = new Server(server);
//const axios = require("axios");
var fcm = require("fcm-notification");
var FCM = new fcm(require("./serviceAccountKey.json"));
const port = 5000;

var admin = require("firebase-admin");
const serverKey =
  "BNVtTkmgb5gO9lCsCUL5JfIRnCXeH2s0HbhY2q4HcA43uULUlQ5KDCbKSKL146mKlCE_jqEP-VlNSG1E5Fyk87M"; // Replace with your FCM Server Key
// async function sendNotification(token, message) {
//   try {
//     const response = await axios.post(
//       "https://fcm.googleapis.com/fcm/send",
//       {
//         to: token, // FCM token of the recipient device
//         notification: {
//           title: message.title,
//           body: message.body,
//         },
//         data: message.data, // Optional: Additional custom data for the client
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `key=${serverKey}`, // Firebase Server Key for authentication
//         },
//       }
//     );
//     console.log("Notification sent successfully:", response.data);
//   } catch (error) {
//     console.error("Error sending notification:");
//   }
// }

// async function sendNotification(token, message) {
//   try {
//     let messageObj = {
//       data: message,
//       notification: null,
//       token: token,

//     };
//     FCM.send(messageObj, function (err, response) {
//       if (err) {
//         console.error("Error sending notification:", err);
//       } else {
//         console.log("Notification sent successfully:", response);
//       }
//     });
//     // const response = await axios.post(
//     //   "https://fcm.googleapis.com/fcm/send",
//     //   {
//     //     to: token, // FCM token of the recipient device
//     //     notification: {
//     //       title: message.title,
//     //       body: message.body,
//     //     },
//     //     data: message.data, // Optional: Additional custom data for the client
//     //   },
//     //   {
//     //     headers: {
//     //       "Content-Type": "application/json",
//     //       Authorization: `key=${serverKey}`, // Firebase Server Key for authentication
//     //     },
//     //   }
//     // );
//     console.log("Notification sent successfully:", response.data);
//   } catch (error) {
//     console.error("Error sending notification:", error);
//   }
// }

async function sendNotification(token, message) {
  try {
    // Ensure the `data` field contains only string values
    const formattedData = {};
    if (message.data) {
      for (const [key, value] of Object.entries(message.data)) {
        formattedData[key] = String(value); // Convert all values to strings
      }
    }

    let messageObj = {
      notification: {
        title: message.title,
        body: message.body,
      },
      data: formattedData, // Use the formatted data with string values
      token: token,
    };

    // Send the message using FCM
    FCM.send(messageObj, function (err, response) {
      if (err) {
        console.error("Error sending notification:", err);
      } else {
        console.log("Notification sent successfully:", response);
      }
    });
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Connect to MongoDB
// mongoose.connect("mongodb://localhost/chatApp", {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });
mongoose.connect("mongodb+srv://pujakchetry55:TMuoSG7NTt7xO0vt@cluster0.wtv4j.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Message schema
const messageSchema = new mongoose.Schema({
  from: String,
  to: String,
  content: String,
  delivered: Boolean,
  timestamp: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  socketId: { type: String, required: true },
  token: { type: String, required: true },
  online: Boolean,
});

const Message = mongoose.model("Message", messageSchema);
const User = mongoose.model("User", userSchema);

// Serve the frontend HTML
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// Fetch messages between two users
app.get("/getMessages", async (req, res) => {
  const { userId1, userId2 } = req.query;

  const messages = await Message.find({
    $or: [
      { from: userId1, to: userId2 },
      { from: userId2, to: userId1 },
    ],
  }).sort({ timestamp: 1 });

  res.status(200).json(messages);
});

// Fetch all the chat recipients
app.get("/getRecipients", async (req, res) => {
  const { userId } = req.query;

  const messages = await Message.find({
    $or: [{ from: userId }, { to: userId }],
  });

  const recipients = new Set();
  messages.forEach((msg) => {
    recipients.add(msg.from === userId ? msg.to : msg.from);
  });

  res.status(200).json(Array.from(recipients));
});

// Socket connection
const users = {}; // not required

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("register", async (data) => {
    try {
      //console.log("userId = ", userId, " and token = ")
      let existingUser = await User.findOne({ userId: data.userId });
      //console.log("kjlk: ",existingUser)
      if (existingUser) {
        existingUser.socketId = socket.id;
        existingUser.token = data.token;
        existingUser.online = true;
        console.log("existing user is : ", existingUser);
        await existingUser.save();
        console.log(`User ${data.userId} updated with socket ID ${socket.id}`);
      } else {
        const newUser = new User({
          userId: data.userId,
          socketId: socket.id,
          token: data.token,
          online: true,
        });
        await newUser.save();
        console.log(
          `User ${data.userId} registered with socket ID ${socket.id}`
        );
      }
    } catch (error) {
      console.error("Error registering user:", error);
    }
  });

  // socket.on("sendMessage", async ({ from, token, to, content }) => {
  //   //const recipientSocketId = users[to];
  //   const recipientUser = await User.findOne({ userId: to });

  //   if (!recipientUser) {
  //     console.error(`Recipient user with ID ${to} not found.`);
  //     return;
  //   }
  //   const recipientSocketId = recipientUser.socketId;

  //   const message = new Message({ from, to, content });
  //   await message.save();
  //   console.log("hi", recipientSocketId);
  //   if (recipientSocketId) {
  //     console.log("hello");
  //     io.to(recipientSocketId).emit("message", {
  //       from,
  //       content,
  //       timestamp: new Date(),
  //     });

  //     const message = {
  //       title: "New Message",
  //       body: "You have received a new message",
  //       data: {
  //         // Custom data if necessary, e.g. message ID
  //         messageId: "12345",
  //       },
  //     };
  //     console.log("sendingmessage");
  //     sendNotification(token, message);
  //   }
  // });

  // can be used to maintian the online status, and for refreshing token when user rejoins

  socket.on("sendMessage", async ({ from, to, content }) => {
    try {
      const recipientUser = await User.findOne({ userId: to });

      if (!recipientUser) {
        console.error(`Recipient user with ID ${to} not found.`);
        return;
      }

      const recipientSocketId = recipientUser.socketId;
      const recipientToken = recipientUser.token;
      let delivered = false;

      // Emit the message to the recipient if they are online
      if (recipientUser.online) {
        console.log(`Emitting message to socket ID: ${recipientSocketId}`);
        io.to(recipientSocketId).emit("message", {
          from,
          content,
          timestamp: new Date(),
        });
        delivered = true;
      } else {
        delivered = false;
      }

      // Save the message to the database
      const message = new Message({ from, to, content, delivered });
      await message.save();

      // Send a push notification to the recipient
      const notificationMessage = {
        title: "New Message",
        body: `${from}: ${content}`,
        data: {
          messageId: message._id.toString(),
        },
      };

      if (recipientToken) {
        console.log("Sending notification...");
        sendNotification(recipientToken, notificationMessage);
      } else {
        console.error(`Recipient user with ID ${to} has no valid token.`);
      }
    } catch (error) {
      console.error("Error in sendMessage:", error);
    }
  });

  socket.on("disconnect", async () => {
    console.log(`User disconnected: ${socket.id}`);
    let existingUser = await User.findOne({socketId: socket.id})
    if(existingUser){
      existingUser.online = false;
    await existingUser.save()
    }
    
    // for (const userId in users) {
    //   if (users[userId] === socket.id) {
    //     delete users[userId];
    //     break;
    //   }
    // }
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
