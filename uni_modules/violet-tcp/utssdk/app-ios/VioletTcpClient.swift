import Foundation
import Network

@objcMembers
public final class VioletTcpClient: NSObject {
    public static let shared = VioletTcpClient()

    private var connection: NWConnection?
    private let queue = DispatchQueue(label: "violet.tcp.client.queue")
    private var connected = false

    public var onOpen: (() -> Void)?
    public var onClose: (() -> Void)?
    public var onError: ((String) -> Void)?
    public var onPacket: ((Int, Data) -> Void)?

    private override init() {
        super.init()
    }

    public func start(host: String, port: Int) {
        stop(emitClose: false)

        guard let nwPort = NWEndpoint.Port(rawValue: UInt16(port)) else {
            DispatchQueue.main.async { self.onError?("invalid port: \(port)") }
            return
        }

        let nwHost = NWEndpoint.Host(host)
        let connection = NWConnection(host: nwHost, port: nwPort, using: .tcp)
        self.connection = connection

        connection.stateUpdateHandler = { [weak self] state in
            guard let self = self else { return }

            switch state {
            case .ready:
                self.connected = true
                DispatchQueue.main.async { self.onOpen?() }
                self.receiveHeader()

            case .failed(let error):
                self.connected = false
                DispatchQueue.main.async {
                    self.onError?("connection failed: \(error.localizedDescription)")
                    self.onClose?()
                }

            case .cancelled:
                self.connected = false
                DispatchQueue.main.async { self.onClose?() }

            default:
                break
            }
        }

        connection.start(queue: queue)
    }

    public func stop() {
        stop(emitClose: true)
    }

    private func stop(emitClose: Bool) {
        connected = false

        if let connection = connection {
            connection.stateUpdateHandler = nil
            connection.cancel()
        }

        connection = nil

        if emitClose {
            DispatchQueue.main.async { self.onClose?() }
        }
    }

    public func sendPacket(packetType: Int, body: Data) {
        guard let connection = connection, connected else {
            DispatchQueue.main.async { self.onError?("socket not connected") }
            return
        }

        var frame = Data()
        frame.append(UInt8(packetType & 0xff))

        let length = UInt32(body.count)
        frame.append(UInt8((length >> 24) & 0xff))
        frame.append(UInt8((length >> 16) & 0xff))
        frame.append(UInt8((length >> 8) & 0xff))
        frame.append(UInt8(length & 0xff))
        frame.append(body)

        connection.send(content: frame, completion: .contentProcessed { [weak self] error in
            if let error = error {
                DispatchQueue.main.async {
                    self?.onError?("send failed: \(error.localizedDescription)")
                }
            }
        })
    }

    private func receiveHeader() {
        guard let connection = connection else { return }

        connection.receive(minimumIncompleteLength: 5, maximumLength: 5) { [weak self] data, _, isComplete, error in
            guard let self = self else { return }

            if let error = error {
                DispatchQueue.main.async { self.onError?("receive header failed: \(error.localizedDescription)") }
                self.stop()
                return
            }

            if isComplete {
                self.stop()
                return
            }

            guard let data = data, data.count == 5 else {
                self.receiveHeader()
                return
            }

            let bytes = [UInt8](data)
            let packetType = Int(bytes[0])
            let length =
                (UInt32(bytes[1]) << 24) |
                (UInt32(bytes[2]) << 16) |
                (UInt32(bytes[3]) << 8) |
                UInt32(bytes[4])

            if length == 0 {
                DispatchQueue.main.async { self.onPacket?(packetType, Data()) }
                self.receiveHeader()
                return
            }

            self.receiveBody(packetType: packetType, length: Int(length))
        }
    }

    private func receiveBody(packetType: Int, length: Int) {
        guard let connection = connection else { return }

        connection.receive(minimumIncompleteLength: length, maximumLength: length) { [weak self] data, _, isComplete, error in
            guard let self = self else { return }

            if let error = error {
                DispatchQueue.main.async { self.onError?("receive body failed: \(error.localizedDescription)") }
                self.stop()
                return
            }

            if isComplete {
                self.stop()
                return
            }

            guard let data = data, data.count == length else {
                self.receiveHeader()
                return
            }

            DispatchQueue.main.async { self.onPacket?(packetType, data) }
            self.receiveHeader()
        }
    }
}
