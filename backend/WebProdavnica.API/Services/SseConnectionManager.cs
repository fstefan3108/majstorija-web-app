using System.Collections.Concurrent;
using System.Threading.Channels;
using WebProdavnica.BusinessLayer.Abstract;

namespace WebProdavnica.API.Services
{
    public class SseConnectionManager : ISsePusher
    {
        // Ključ: "user:5" ili "craftsman:3"
        // Vrednost: mapa connectionId → channel writer
        private readonly ConcurrentDictionary<string, ConcurrentDictionary<Guid, ChannelWriter<string>>> _clients = new();

        private static string Key(int id, string type) => $"{type}:{id}";

        /// <summary>Registruj novu SSE konekciju. Vraća ID konekcije i reader za čitanje poruka.</summary>
        public (Guid connectionId, ChannelReader<string> reader) Connect(int recipientId, string recipientType)
        {
            var connectionId = Guid.NewGuid();
            var channel = Channel.CreateUnbounded<string>(new UnboundedChannelOptions { SingleReader = true });
            _clients.GetOrAdd(Key(recipientId, recipientType), _ => new())
                    .TryAdd(connectionId, channel.Writer);
            return (connectionId, channel.Reader);
        }

        /// <summary>Ukloni konekciju (poziva se kad client zatvori tab ili se diskonektuje).</summary>
        public void Disconnect(int recipientId, string recipientType, Guid connectionId)
        {
            var key = Key(recipientId, recipientType);
            if (_clients.TryGetValue(key, out var conns))
            {
                conns.TryRemove(connectionId, out var writer);
                writer?.TryComplete();
            }
        }

        /// <summary>Pošalji JSON string svim aktivnim konekcijama datog primaoca.</summary>
        public async Task PushAsync(int recipientId, string recipientType, string jsonData)
        {
            var key = Key(recipientId, recipientType);
            if (!_clients.TryGetValue(key, out var conns)) return;

            foreach (var (id, writer) in conns)
            {
                try
                {
                    await writer.WriteAsync(jsonData);
                }
                catch
                {
                    conns.TryRemove(id, out _);
                }
            }
        }
    }
}
