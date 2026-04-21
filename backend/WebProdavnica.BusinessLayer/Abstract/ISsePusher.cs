namespace WebProdavnica.BusinessLayer.Abstract
{
    public interface ISsePusher
    {
        Task PushAsync(int recipientId, string recipientType, string jsonData);
    }
}
