#include "msfs_turnaround/websocket_server.hpp"

#include <iostream>

namespace msfs_turnaround {

WebSocketServer::WebSocketServer(int port)
    : port_(port) {}

bool WebSocketServer::start() {
    server_ = std::make_unique<ix::WebSocketServer>(port_);

    server_->setOnClientMessageCallback(
        [this](std::shared_ptr<ix::ConnectionState> connectionState,
               ix::WebSocket& webSocket,
               const ix::WebSocketMessagePtr& message) {
            if (message->type == ix::WebSocketMessageType::Open) {
                {
                    std::lock_guard<std::mutex> lock(clientsMutex_);
                    clients_.insert(&webSocket);
                }

                std::cout << "Frontend connected: "
                          << connectionState->getRemoteIp()
                          << std::endl;
            }

            if (message->type == ix::WebSocketMessageType::Close) {
                {
                    std::lock_guard<std::mutex> lock(clientsMutex_);
                    clients_.erase(&webSocket);
                }

                std::cout << "Frontend disconnected." << std::endl;
            }

            if (message->type == ix::WebSocketMessageType::Error) {
                std::cerr << "WebSocket error: "
                          << message->errorInfo.reason
                          << std::endl;
            }
        }
    );

    auto result = server_->listen();

    if (!result.first) {
        std::cerr << "Failed to start WebSocket server: "
                  << result.second
                  << std::endl;
        return false;
    }

    server_->start();

    std::cout << "WebSocket server listening on ws://localhost:"
              << port_
              << std::endl;

    return true;
}

void WebSocketServer::stop() {
    if (server_ != nullptr) {
        server_->stop();
    }
}

void WebSocketServer::broadcast(const std::string& message) {
    std::lock_guard<std::mutex> lock(clientsMutex_);

    for (auto* client : clients_) {
        if (client != nullptr) {
            client->send(message);
        }
    }
}

}