## React Native Chat System Implementation Guide (with Redux)

This guide provides a high-level overview of how to implement the chat system in a React Native application using Redux for state management.

### . API and Data Guide

This section details the API endpoints, socket events, and data structures required for the chat feature.

#### a. REST API Endpoints

All endpoints require a `Bearer` token in the `Authorization` header.

- **`POST /api/v1/upload`**: Uploads an image.
  - **Request**: `FormData` with a single field `image` containing the image file.
  - **Response**: 
    ```json
    {
      "success": true,
      "message": "File uploaded successfully",
      "fileUrl": "<URL_to_the_uploaded_image>"
    }
    ```

- **`GET /api/v1/messages/:id?chatType=<type>`**: Fetches the message history for a specific chat.
  - **URL Params**:
    - `:id`: The ID of the problem or support ticket.
    - `chatType`: Either `'problem'` or `'support'`.
  - **Response**: A JSON object containing the list of messages.

- **`GET /api/v1/messages/conversations?type=<type>`**: Fetches the list of conversations for the current user.
  - **Query Params**:
    - `type`: Either `'problem'` or `'support'`.
  - **Response**: A JSON object containing a list of conversations.

#### b. Socket.IO Events

- **`joinRoom` (Client to Server)**: Joins a user to a specific chat room.
  - **Payload**:
    ```javascript
    {
      chatType: 'problem' | 'support',
      problemId: '<problem_id>', // if chatType is 'problem'
      supportId: '<support_id>' // if chatType is 'support'
    }
    ```

- **`sendMessage` (Client to Server)**: Sends a new message to the room.
  - **Payload**:
    ```javascript
    {
      chatType: 'problem' | 'support',
      problemId: '<problem_id>', // if chatType is 'problem'
      supportId: '<support_id>', // if chatType is 'support'
      senderId: '<user_id>',
      message: 'Hello, world!', // Can be null if imageUrl is present
      imageUrl: '<url_of_image>' // Can be null if message is present
    }
    ```

- **`newMessage` (Server to Client)**: Broadcasts a new message to all users in a room.
  - **Payload**: The full `Message` object (see Data Models below).

#### c. Data Models

- **Message Object**:
  ```javascript
  {
    _id: 'mongoose.Types.ObjectId',
    problemId: 'mongoose.Types.ObjectId', // or null
    supportId: 'mongoose.Types.ObjectId', // or null
    chatType: 'problem' | 'support',
    senderId: { // Populated User object
      _id: 'mongoose.Types.ObjectId',
      name: 'String',
      // ... other user fields
    },
    message: 'String', // or null
    imageUrl: 'String', // or null
    readBy: ['mongoose.Types.ObjectId'],
    createdAt: 'Date'
  }
  ```

- **User Object (senderId)**: The `senderId` field in the message object will be populated with the user's details, including `_id` and `name`.

### 6. Handling Authentication

Properly handling authentication is critical for securing the chat. The JWT (JSON Web Token) provided by the backend upon user login must be securely stored on the device and sent with every authenticated request. When implementing, you will need to:

1.  **Store the Token**: After a user logs in, save the JWT token to the device. Use a secure storage method; for example, `@react-native-async-storage/async-storage` is a common choice, but for production applications, consider a more secure, encrypted alternative like `react-native-keychain`.

2.  **Authenticate API Calls**: For any REST API requests that require authentication (such as fetching message history or uploading files), you must include the JWT in the `Authorization` header as a `Bearer` token. The best practice is to create a centralized API client (e.g., an Axios instance) that automatically attaches this header to all outgoing requests.

3.  **Authenticate the Socket Connection**: The real-time socket connection also needs to be authenticated. When you initialize the Socket.IO client, retrieve the token from storage and pass it in the `auth` object within the socket options. The backend will then verify the token before allowing the connection to be established, ensuring that only logged-in users can participate in the chat.

### 1. Dependencies

Install the necessary packages for your React Native project:

```bash
# For state management
npm install redux react-redux @reduxjs/toolkit

# For API calls
npm install axios

# For WebSocket communication
npm install socket.io-client

# For secure token storage
npm install @react-native-async-storage/async-storage

# For image picking
npm install react-native-image-picker
```

### 2. Redux Setup

Organize your Redux store, actions, and reducers.

#### a. Chat Slice (`chatSlice.js`)

Using Redux Toolkit is highly recommended for simplicity.

```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://localhost:3001/api/v1'; // Your backend URL

// Async thunk to fetch chat history
export const fetchChatMessages = createAsyncThunk(
  'chat/fetchMessages',
  async ({ chatType, id }, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('jwt_token');
      const response = await axios.get(`${BASE_URL}/messages/${id}?chatType=${chatType}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data.messages;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    messages: [],
    loading: false,
    error: null,
  },
  reducers: {
    // Action to add a new message received from Socket.IO
    addMessage: (state, action) => {
      // Avoid adding duplicate messages
      if (!state.messages.find(msg => msg._id === action.payload._id)) {
        state.messages.push(action.payload);
      }
    },
    clearMessages: (state) => {
      state.messages = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChatMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChatMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = action.payload;
      })
      .addCase(fetchChatMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { addMessage, clearMessages } = chatSlice.actions;
export default chatSlice.reducer;
```

#### b. Redux Store (`store.js`)

```javascript
import { configureStore } from '@reduxjs/toolkit';
import chatReducer from './chatSlice';

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    // ...other reducers
  },
});
```

### 3. Services

#### a. Socket.IO Service

Create a singleton service to manage the Socket.IO connection.

```javascript
// services/socketService.js
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '../redux/store'; // Your Redux store
import { addMessage } from '../redux/chatSlice'; // Your chat slice action

const SOCKET_URL = 'http://localhost:3001';
let socket;

export const initSocket = async () => {
  try {
    const token = await AsyncStorage.getItem('jwt_token');
    if (!token) {
      console.log('Socket: No token found');
      return;
    }

    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token },
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('newMessage', (message) => {
      console.log('New message received:', message);
      // Dispatch action to add message to Redux store
      store.dispatch(addMessage(message));
    });

    socket.on('authentication_error', (error) => {
      console.error('Socket Authentication Error:', error);
      // Handle auth errors, e.g., navigate to login
    });

  } catch (error) {
    console.error("Socket initialization error:", error);
  }
};

export const joinRoom = (chatType, id) => {
  if (!socket) return;
  const payload = { chatType, [chatType === 'problem' ? 'problemId' : 'supportId']: id };
  socket.emit('joinRoom', payload);
  console.log('Joined room:', payload);
};

export const sendMessage = (chatType, id, senderId, message, imageUrl) => {
  if (!socket) return;
  const payload = {
    chatType,
    [chatType === 'problem' ? 'problemId' : 'supportId']: id,
    senderId,
    message: message || null,
    imageUrl: imageUrl || null,
  };
  socket.emit('sendMessage', payload);
  console.log('Sent message:', payload);
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
  }
};
```

#### b. Upload Service

```javascript
// services/uploadService.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://localhost:3001/api/v1';

export const uploadImage = async (image) => {
  try {
    const token = await AsyncStorage.getItem('jwt_token');
    const formData = new FormData();
    formData.append('image', {
      uri: image.uri,
      type: image.type,
      name: image.fileName,
    });

    const response = await axios.post(`${BASE_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data.fileUrl; // The URL of the uploaded image
  } catch (error) {
    console.error('Image upload error:', error.response.data);
    throw error;
  }
};
```

### 4. React Native UI Integration (ChatScreen.js)

Connect your components to Redux and use the services.

```javascript
// screens/ChatScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, ActivityIndicator, Image } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { fetchChatMessages, clearMessages } from '../redux/chatSlice';
import { initSocket, joinRoom, sendMessage, disconnectSocket } from '../services/socketService';
import { launchImageLibrary } from 'react-native-image-picker';
import { uploadImage } from '../services/uploadService';

// Assume navigation props `route.params` contain { chatType, conversationId, currentUserId }
const ChatScreen = ({ route }) => {
  const { chatType, conversationId, currentUserId } = route.params;
  const dispatch = useDispatch();
  const { messages, loading, error } = useSelector((state) => state.chat);
  const [input, setInput] = useState('');

  useEffect(() => {
    // 1. Initialize Socket.IO connection
    initSocket();

    // 2. Join the chat room
    joinRoom(chatType, conversationId);

    // 3. Fetch initial messages
    dispatch(fetchChatMessages({ chatType, id: conversationId }));

    // Cleanup on unmount
    return () => {
      dispatch(clearMessages());
      disconnectSocket();
    };
  }, [dispatch, chatType, conversationId]);

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(chatType, conversationId, currentUserId, input.trim(), null);
      setInput('');
    }
  };

  const handlePickAndUploadImage = () => {
    launchImageLibrary({ mediaType: 'photo' }, async (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
      } else if (response.assets && response.assets.length > 0) {
        const image = response.assets[0];
        try {
          // 1. Upload the image
          const imageUrl = await uploadImage(image);

          // 2. Send the message with the image URL
          sendMessage(chatType, conversationId, currentUserId, null, imageUrl);

        } catch (error) {
          console.error('Failed to upload image and send message:', error);
        }
      }
    });
  };

  if (loading) {
    return <ActivityIndicator size="large" />;
  }

  if (error) {
    return <Text>Error: {error.message || 'Failed to load messages'}</Text>;
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={messages.slice().reverse()} // Reverse the array for inverted list
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={{ padding: 10 }}>
            <Text>{item.senderId.name}:</Text>
            {item.message && <Text>{item.message}</Text>}
            {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={{ width: 200, height: 200 }} />}
          </View>
        )}
        inverted // To show latest messages at the bottom
      />
      <View style={{ flexDirection: 'row', padding: 10 }}>
        <TextInput
          style={{ flex: 1, borderWidth: 1, marginRight: 10 }}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
        />
        <Button title="Send" onPress={handleSend} />
        <Button title="Attach" onPress={handlePickAndUploadImage} />
      </View>
    </View>
  );
};

export default ChatScreen;
```

