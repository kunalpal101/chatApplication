// firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/8.0.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.0.0/firebase-messaging.js');

// Initialize Firebase in the service worker
const firebaseConfig = {
  apiKey: "AIzaSyBrMY2ikf63p5LX0LZwd7SlzOLwPB1cKns",
  authDomain: "chat-app-2f158.firebaseapp.com",
  projectId: "chat-app-2f158",
  storageBucket: "chat-app-2f158.appspot.com",
  messagingSenderId: "493786510903",
  appId: "1:493786510903:web:e274620381f94b5472f1b2",
  measurementId: "G-5T0WL3PMR1",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function (payload) {
  console.log("Received background message: ", payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
