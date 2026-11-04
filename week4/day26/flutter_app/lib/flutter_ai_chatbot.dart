import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class FlutterAIChatbot extends StatefulWidget {
  /// Android emulator: http://10.0.2.2:5003
  /// iOS simulator: http://127.0.0.1:5003
  /// Physical device: http://YOUR_COMPUTER_LAN_IP:5003
  final String baseUrl;
  final String title;

  const FlutterAIChatbot({
    super.key,
    this.baseUrl = 'http://10.0.2.2:5003',
    this.title = 'AI Assistant',
  });

  @override
  State<FlutterAIChatbot> createState() => _FlutterAIChatbotState();
}

class _FlutterAIChatbotState extends State<FlutterAIChatbot> {
  static const String _threadKey = 'day26_mobile_chat_thread';
  static const String _historyPrefix = 'day26_mobile_chat_history_';

  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  final List<Map<String, dynamic>> _messages = [];

  String? _threadId;
  String? _error;
  bool _loading = false;
  bool _ready = false;

  String get _baseUrl => widget.baseUrl.replaceFirst(RegExp(r'/+$'), '');

  @override
  void initState() {
    super.initState();
    _loadConversation();
  }

  Future<void> _loadConversation() async {
    try {
      final preferences = await SharedPreferences.getInstance();

      var threadId = preferences.getString(_threadKey);

      if (threadId == null || threadId.isEmpty) {
        threadId =
            'mobile-${DateTime.now().microsecondsSinceEpoch.toRadixString(36)}';

        await preferences.setString(_threadKey, threadId);
      }

      final saved = preferences.getString('$_historyPrefix$threadId');

      if (saved != null && saved.isNotEmpty) {
        final decoded = jsonDecode(saved);

        if (decoded is List) {
          for (final item in decoded) {
            if (item is Map &&
                item['id'] is String &&
                item['role'] is String &&
                item['text'] is String) {
              final role = item['role'];

              if (role == 'user' || role == 'assistant') {
                _messages.add({
                  'id': item['id'],
                  'role': role,
                  'text': item['text'],
                  'createdAt': item['createdAt']?.toString() ?? '',
                });
              }
            }
          }
        }
      }

      if (!mounted) return;

      setState(() {
        _threadId = threadId;
        _error = null;
      });
    } catch (exception) {
      if (mounted) {
        setState(() {
          _error = 'Could not load saved conversation: $exception';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _ready = true;
        });
        _scrollToBottom();
      }
    }
  }

  Future<void> _saveMessages() async {
    final threadId = _threadId;
    if (threadId == null) return;

    final preferences = await SharedPreferences.getInstance();

    await preferences.setString(
      '$_historyPrefix$threadId',
      jsonEncode(_messages),
    );
  }

  Map<String, dynamic> _createMessage(String role, String text) {
    return {
      'id': '${DateTime.now().microsecondsSinceEpoch}-${_messages.length}',
      'role': role,
      'text': text,
      'createdAt': DateTime.now().toIso8601String(),
    };
  }

  Future<Map<String, dynamic>> _decodeResponse(http.Response response) async {
    dynamic decoded;

    try {
      decoded = jsonDecode(response.body);
    } on FormatException {
      throw Exception('The AI service returned an invalid response.');
    }

    if (decoded is! Map<String, dynamic>) {
      throw Exception('The AI service returned an unexpected response.');
    }

    if (response.statusCode < 200 ||
        response.statusCode >= 300 ||
        decoded['success'] == false) {
      final message = decoded['error'];

      throw Exception(
        message is String
            ? message
            : 'Request failed with HTTP ${response.statusCode}.',
      );
    }

    return decoded;
  }

  Future<void> _sendMessage() async {
    final message = _messageController.text.trim();
    final threadId = _threadId;

    if (message.isEmpty || threadId == null || _loading || !_ready) {
      return;
    }

    if (message.length > 10000) {
      _showError('Messages must be 10,000 characters or fewer.');
      return;
    }

    final userMessage = _createMessage('user', message);

    setState(() {
      _messages.add(userMessage);
      _messageController.clear();
      _error = null;
      _loading = true;
    });

    _scrollToBottom();

    try {
      await _saveMessages();

      final response = await http
          .post(
            Uri.parse('$_baseUrl/mobile/chat'),
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: jsonEncode({
              'message': message,
              'thread_id': threadId,
              'agent_type': 'conversation',
            }),
          )
          .timeout(const Duration(seconds: 90));

      final data = await _decodeResponse(response);
      final answer = data['response'];

      if (answer is! String || answer.trim().isEmpty) {
        throw Exception('The AI service returned an empty response.');
      }

      if (!mounted) return;

      setState(() {
        _messages.add(_createMessage('assistant', answer.trim()));
      });

      await _saveMessages();
      _scrollToBottom();
    } on TimeoutException {
      _messageController.text = message;
      _showError('The AI service timed out. Please try again.');
    } catch (exception) {
      _messageController.text = message;
      _showError(exception.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _clearConversation() async {
    final threadId = _threadId;
    if (threadId == null || _loading) return;

    final shouldClear = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear conversation?'),
        content: const Text(
          'This clears saved chat history on this device and '
          'the AI conversation memory on the server.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Clear', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (shouldClear != true || !mounted) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final response = await http
          .post(
            Uri.parse('$_baseUrl/mobile/memory/clear'),
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: jsonEncode({'thread_id': threadId}),
          )
          .timeout(const Duration(seconds: 30));

      await _decodeResponse(response);

      final preferences = await SharedPreferences.getInstance();
      await preferences.remove('$_historyPrefix$threadId');

      if (!mounted) return;

      setState(() {
        _messages.clear();
        _messageController.clear();
      });

      _showMessage('Conversation and server memory cleared.');
    } on TimeoutException {
      _showError('The memory service timed out. Try again.');
    } catch (exception) {
      _showError(exception.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;

      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  void _showError(String message) {
    if (!mounted) return;

    setState(() {
      _error = message;
    });
  }

  void _showMessage(String message) {
    if (!mounted) return;

    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Widget _buildMessage(Map<String, dynamic> message) {
    final isUser = message['role'] == 'user';

    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.82,
        ),
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        decoration: BoxDecoration(
          color: isUser ? const Color(0xFF4967D8) : Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isUser ? 16 : 4),
            bottomRight: Radius.circular(isUser ? 4 : 16),
          ),
          border: isUser ? null : Border.all(color: const Color(0xFFE5E9F1)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              message['text']?.toString() ?? '',
              style: TextStyle(
                color: isUser ? Colors.white : const Color(0xFF27334A),
                fontSize: 14,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 5),
            Text(
              _formatTime(message['createdAt']?.toString()),
              style: TextStyle(
                color: isUser
                    ? const Color(0xFFDCE4FF)
                    : const Color(0xFF929BAD),
                fontSize: 10,
              ),
              textAlign: TextAlign.right,
            ),
          ],
        ),
      ),
    );
  }

  String _formatTime(String? value) {
    if (value == null || value.isEmpty) return '';

    final date = DateTime.tryParse(value);
    if (date == null) return '';

    final local = date.toLocal();
    final hour = local.hour % 12 == 0 ? 12 : local.hour % 12;
    final minute = local.minute.toString().padLeft(2, '0');
    final period = local.hour < 12 ? 'AM' : 'PM';

    return '$hour:$minute $period';
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.title,
              style: const TextStyle(
                color: Color(0xFF18233B),
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
            const Text(
              'Powered by your local AI service',
              style: TextStyle(color: Color(0xFF7A8498), fontSize: 11),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Clear conversation',
            onPressed: !_ready || _loading || _messages.isEmpty
                ? null
                : _clearConversation,
            icon: const Icon(Icons.delete_outline),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: !_ready
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                ? const Center(
                    child: Padding(
                      padding: EdgeInsets.all(28),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.chat_bubble_outline,
                            size: 42,
                            color: Color(0xFF8791A3),
                          ),
                          SizedBox(height: 12),
                          Text(
                            'Start a conversation',
                            style: TextStyle(
                              color: Color(0xFF26334D),
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          SizedBox(height: 6),
                          Text(
                            'Ask a question or tell the assistant '
                            'what you need.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Color(0xFF8791A3),
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(14),
                    itemCount: _messages.length + (_loading ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == _messages.length) {
                        return const Padding(
                          padding: EdgeInsets.symmetric(vertical: 12),
                          child: Row(
                            children: [
                              SizedBox(
                                width: 17,
                                height: 17,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              ),
                              SizedBox(width: 10),
                              Text(
                                'AI is thinking…',
                                style: TextStyle(
                                  color: Color(0xFF7A8498),
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        );
                      }

                      return _buildMessage(_messages[index]);
                    },
                  ),
          ),
          if (_error != null)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.fromLTRB(12, 0, 12, 8),
              padding: const EdgeInsets.all(11),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF0F0),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                _error!,
                style: const TextStyle(color: Color(0xFFA12622), fontSize: 12),
              ),
            ),
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Color(0xFFE2E6EF))),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      minLines: 1,
                      maxLines: 5,
                      maxLength: 10000,
                      enabled: _ready && !_loading,
                      textCapitalization: TextCapitalization.sentences,
                      onSubmitted: (_) => _sendMessage(),
                      decoration: InputDecoration(
                        hintText: 'Write your message…',
                        counterText: '',
                        filled: true,
                        fillColor: const Color(0xFFF1F3F8),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 12,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 9),
                  SizedBox(
                    height: 48,
                    width: 52,
                    child: FilledButton(
                      onPressed: !_ready || _loading ? null : _sendMessage,
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFF4967D8),
                        padding: EdgeInsets.zero,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(13),
                        ),
                      ),
                      child: _loading
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            )
                          : const Icon(Icons.send, size: 19),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
