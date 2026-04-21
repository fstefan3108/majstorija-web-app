using WebProdavnica.BusinessLayer.Abstract;
using WebProdavnica.BusinessLayer.Impl;
using WebProdavnica.DAL.Abstract;
using WebProdavnica.DAL.Impl;
using ICraftsmanScheduleRepository = WebProdavnica.DAL.Abstract.ICraftsmanScheduleRepository;
using CraftsmanScheduleRepository = WebProdavnica.DAL.Impl.CraftsmanScheduleRepository;
using ICraftsmanScheduleService = WebProdavnica.BusinessLayer.Abstract.ICraftsmanScheduleService;
using CraftsmanScheduleService = WebProdavnica.BusinessLayer.Impl.CraftsmanScheduleService;
using Entities.Configuration;
using WebProdavnica.Entities.Configuration;

var builder = WebApplication.CreateBuilder(args);

var jwtSettings = builder.Configuration.GetSection("JwtSettings").Get<Entities.Configuration.JwtSettings>()!;
builder.Services.AddSingleton<Entities.Configuration.JwtSettings>(jwtSettings);

builder.Services.AddControllers(options =>
{
    options.Filters.Add<WebProdavnica.Filters.ValidationFilter>();
});
builder.Services.Configure<Microsoft.AspNetCore.Mvc.ApiBehaviorOptions>(options =>
{
    options.SuppressModelStateInvalidFilter = true;
});

// SMTP settings (singleton — iz appsettings)
var smtpSettings = builder.Configuration.GetSection("Smtp").Get<SmtpSettings>()
    ?? new SmtpSettings();
builder.Services.AddSingleton(smtpSettings);

// REGISTER REPOSITORIES
builder.Services.AddScoped<ICraftsmanScheduleRepository, CraftsmanScheduleRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IPaymentRepository, PaymentRepository>();
builder.Services.AddScoped<IJobOrderRepository, JobOrderRepository>();
builder.Services.AddScoped<ICraftsmanRepository, CraftsmanRepository>();
builder.Services.AddScoped<IChatRepository, ChatRepository>();
builder.Services.AddScoped<ICardTokenRepository, CardTokenRepository>();
builder.Services.AddScoped<IReviewRepository, ReviewRepository>();
builder.Services.AddScoped<IJobRequestRepository, JobRequestRepository>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();

// REGISTER BUSINESS LAYER SERVICES
builder.Services.AddScoped<ICraftsmanScheduleService, CraftsmanScheduleService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ICraftsmanService, CraftsmanService>();
builder.Services.AddScoped<IJobOrderService, JobOrderService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IChatService, ChatService>();
builder.Services.AddScoped<ICardTokenService, CardTokenService>();
builder.Services.AddScoped<IReviewService, ReviewService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IJobRequestService, JobRequestService>();
builder.Services.AddSingleton<WebProdavnica.API.Services.SseConnectionManager>();
builder.Services.AddSingleton<WebProdavnica.BusinessLayer.Abstract.ISsePusher>(sp =>
    sp.GetRequiredService<WebProdavnica.API.Services.SseConnectionManager>());

// CORS za React
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins(
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:5175",
            "http://localhost:5176",
            "http://localhost:5177",
            "http://localhost:3000"
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});


builder.Services.AddHttpClient("AllSecure", client =>
{
    var config = builder.Configuration.GetSection("AllSecure");
    client.BaseAddress = new Uri(config["BaseUrl"]!);
});
builder.Services.AddScoped<WebProdavnica.API.Services.AllSecureClient>();
builder.Services.AddHostedService<WebProdavnica.API.Services.AutoCaptureService>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowReactApp");
app.UseStaticFiles(); // Sluzi wwwroot/uploads/* za slike zahteva
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.Run();