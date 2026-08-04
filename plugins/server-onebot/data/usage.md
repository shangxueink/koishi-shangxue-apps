# server-onebot usage

This plugin exposes a OneBot v11 server for Koishi. It can accept OneBot clients over a forward WebSocket server and can connect to OneBot backends through reverse WebSocket clients.

Enable at least one transport in the plugin configuration. Both transports share the same action registry and dispatcher.

## Typical topology

OneBot client -> server-onebot -> Koishi adapters -> target platform

For cross-instance calls:

OneBot client -> server-onebot on Koishi A -> adapter-satori -> server-satori on Koishi B -> platform adapter

## Notes

- Configure a stable numeric `selfId` for each server instance.
- Use matching WebSocket paths and tokens on both sides.
- Enable debug logging when diagnosing request or response timeouts.
- The project is under active development. Issues and pull requests are welcome.
