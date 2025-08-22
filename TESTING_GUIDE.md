## Flutter Chat System Implementation Guide

This guide provides a high-level overview of how to implement the chat system in a Flutter application, interacting with the provided Node.js backend.

### 1. Dependencies

Add the following dependencies to your `pubspec.yaml`:

```yaml
dependencies:
  http: ^1.0.0 # For REST API calls
  socket_io_client: ^2.0.0 # For Socket.IO communication
  # Add other necessary dependencies like provider, flutter_secure_storage, etc.
```

Then run `flutter pub get`.

### 2. API Service (REST)

Create a service for handling REST API calls, especially for fetching chat history.

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
// import 'package:flutter_secure_storage/flutter_secure_storage.dart'; // For storing tokens

class ChatApiService {
  final String baseUrl = 'http://localhost:3001/api/v1'; // Your backend URL
  // final _storage = const FlutterSecureStorage();

  Future<String?> _getAuthToken() async {
    // Implement logic to retrieve your stored JWT token
    // return await _storage.read(key: 'jwt_token');
    return 'YOUR_AUTH_TOKEN_HERE'; // Replace with actual token retrieval
  }

  Future<List<dynamic>> getChatMessages(String chatType, String id) async {
    final token = await _getAuthToken();
    if (token == null) {
      throw Exception('Authentication token not found.');
    }

    final response = await http.get(
      Uri.parse('$baseUrl/messages/$id?chatType=$chatType'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      if (chatType == 'problem') {
        return data['data']['messages'];
      } else { // support
        return data['data']['messages'];
      }
    } else {
      throw Exception('Failed to load messages: ${response.statusCode}');
    }
  }

  Future<List<dynamic>> getChatList({String? supportId, String? problemId}) async {
    final token = await _getAuthToken();
    if (token == null) {
      throw Exception('Authentication token not found.');
    }

    String queryParams = '';
    if (supportId != null) {
      queryParams += 'supportId=$supportId';
    }
    if (problemId != null) {
      queryParams += '${queryParams.isEmpty ? '' : '&'}problemId=$problemId';
    }

    final response = await http.get(
      Uri.parse('$baseUrl/messages/conversations?${queryParams}'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['data'];
    } else {
      throw Exception('Failed to load chat list: ${response.statusCode}');
    }
  }

  // Add other REST API calls as needed (e.g., mark message as read)
}
```

### 3. Socket.IO Service

Create a service to manage the Socket.IO connection and events.

```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;
// import 'package:flutter_secure_storage/flutter_secure_storage.dart'; // For storing tokens

class ChatSocketService {
  late IO.Socket _socket;
  // final _storage = const FlutterSecureStorage();

  Function(Map<String, dynamic>)? onNewMessage; // Callback for new messages

  Future<void> connect() async {
    // final token = await _storage.read(key: 'jwt_token');
    final token = 'YOUR_AUTH_TOKEN_HERE'; // Replace with actual token retrieval

    if (token == null) {
      throw Exception('Authentication token not found.');
    }

    _socket = IO.io(
      'http://localhost:3001', // Your backend Socket.IO URL
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .enableForceNew()
          .enableAutoConnect()
          .setExtraHeaders({'Authorization': 'Bearer $token'}) // Pass token in headers
          .setAuth({'token': token}) // Pass token in auth payload
          .build(),
    );

    _socket.connect();

    _socket.onConnect((_) {
      print('Socket connected');
    });

    _socket.onDisconnect((_) {
      print('Socket disconnected');
    });

    _socket.onConnectError((err) {
      print('Socket Connect Error: $err');
    });

    _socket.onError((err) {
      print('Socket Error: $err');
    });

    _socket.on('newMessage', (data) {
      print('New message received: $data');
      if (onNewMessage != null) {
        onNewMessage!(data); // Trigger callback
      }
    });

    _socket.on('authentication_error', (data) {
      print('Authentication Error: $data');
      // Handle authentication errors (e.g., redirect to login)
    });
  }

  void joinRoom(String chatType, String id) {
    _socket.emit('joinRoom', {
      'chatType': chatType,
      chatType == 'problem' ? 'problemId' : 'supportId': id,
    });
    print('Joined room: $chatType/$id');
  }

  void sendMessage(String chatType, String id, String senderId, String message) {
    _socket.emit('sendMessage', {
      'chatType': chatType,
      chatType == 'problem' ? 'problemId' : 'supportId': id,
      'senderId': senderId, // Ensure this matches the authenticated user's ID
      'message': message,
    });
    print('Sent message: $message to $chatType/$id');
  }

  void disconnect() {
    _socket.disconnect();
  }
}
```

### 4. Flutter UI Integration (Example)

Integrate these services into your Flutter UI (e.g., using `Provider` or `Bloc` for state management).

```dart
// Example of a ChatScreen widget
import 'package:flutter/material.dart';
import 'package:your_app/services/chat_api_service.dart'; // Your API service
import 'package:your_app/services/chat_socket_service.dart'; // Your Socket.IO service

class ChatScreen extends StatefulWidget {
  final String chatType;
  final String conversationId; // MongoDB _id of Problem or Support
  final String currentUserId; // MongoDB _id of the logged-in user

  const ChatScreen({
    Key? key,
    required this.chatType,
    required this.conversationId,
    required this.currentUserId,
  }) : super(key: key);

  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final ChatApiService _apiService = ChatApiService();
  final ChatSocketService _socketService = ChatSocketService();
  final TextEditingController _messageController = TextEditingController();
  List<dynamic> _messages = [];

  @override
  void initState() {
    super.initState();
    _connectAndLoadChat();
  }

  Future<void> _connectAndLoadChat() async {
    try {
      // 1. Connect to Socket.IO
      await _socketService.connect();
      _socketService.onNewMessage = (msg) {
        // Prevent duplicates if message is already in history
        if (!_messages.any((m) => m['_id'] == msg['_id'])) {
          setState(() {
            _messages.add(msg);
          });
        }
      };

      // 2. Join the specific chat room
      _socketService.joinRoom(widget.chatType, widget.conversationId);

      // 3. Fetch chat history via REST API
      final history = await _apiService.getChatMessages(
        widget.chatType,
        widget.conversationId,
      );
      setState(() {
        _messages = history;
      });
    } catch (e) {
      print('Error connecting or loading chat: $e');
      // Handle error (e.g., show a SnackBar)
    }
  }

  void _sendMessage() {
    if (_messageController.text.isNotEmpty) {
      _socketService.sendMessage(
        widget.chatType,
        widget.conversationId,
        widget.currentUserId,
        _messageController.text,
      );
      _messageController.clear();
    }
  }

  @override
  void dispose() {
    _socketService.disconnect();
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Chat - ${widget.conversationId}')),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final message = _messages[index];
                return ListTile(
                  title: Text(message['message']),
                  subtitle: Text('From: ${message['senderId']['name'] ?? message['senderId']}'),
                  // Add more message details as needed
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    decoration: const InputDecoration(hintText: 'Enter message'),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.send),
                  onPressed: _sendMessage,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
```

### 5. Handling Authentication Tokens

Ensure your Flutter app securely stores and retrieves JWT tokens (both access and refresh tokens). Libraries like `flutter_secure_storage` are recommended for this. Pass the access token in the `Authorization` header for REST calls and in the `auth` payload/`extraHeaders` for Socket.IO connections.

### 6. Data Models

Create Dart classes for your backend models (e.g., `Message`, `User`, `Problem`, `Support`) to easily parse JSON responses.

```dart
// Example: lib/models/message.dart
class Message {
  final String id;
  final String message;
  final String senderId; // Or a more detailed User object
  final String chatType;
  // Add other fields like problemId, supportId, imageUrl, createdAt, readBy

  Message({
    required this.id,
    required this.message,
    required this.senderId,
    required this.chatType,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['_id'],
      message: json['message'],
      senderId: json['senderId']['_id'] ?? json['senderId'], // Handle populated senderId
      chatType: json['chatType'],
    );
  }
}
```

This guide provides a solid foundation for implementing the chat system in Flutter. Remember to adapt it to your specific Flutter project structure and state management solution.