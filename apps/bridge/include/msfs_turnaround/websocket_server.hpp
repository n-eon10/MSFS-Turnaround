#pragma once

#include <ixwebsocket/IXWebSocketServer.h>

#include <memory>
#include <mutex>
#include <string>
#include <unordered_set>

namespace msfs_turnaround {

class WebSocketServer {
public:
    explicit WebSocketServer(int port);

    bool start();
    void stop();
    void broadcast(const std::string& message);

private:
    int port_;
    std::unique_ptr<ix::WebSocketServer> server_;
    std::mutex clientsMutex_;
    std::unordered_set<ix::WebSocket*> clients_;
};

}