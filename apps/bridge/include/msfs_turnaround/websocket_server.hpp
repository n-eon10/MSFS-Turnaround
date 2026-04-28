#pragma once

#include <ixwebsocket/IXWebSocketServer.h>

#include <functional>
#include <memory>
#include <mutex>
#include <string>
#include <unordered_set>

namespace msfs_turnaround {

class WebSocketServer {
public:
    using ClientMessageHandler = std::function<void(
        const std::string&,
        const std::function<void(const std::string&)>&
    )>;

    explicit WebSocketServer(int port);

    bool start();
    void stop();
    void broadcast(const std::string& message);
    void setClientMessageHandler(ClientMessageHandler handler);

private:
    int port_;
    std::unique_ptr<ix::WebSocketServer> server_;
    std::mutex clientsMutex_;
    std::unordered_set<ix::WebSocket*> clients_;
    ClientMessageHandler clientMessageHandler_;
};

}
