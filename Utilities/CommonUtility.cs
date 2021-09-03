using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;
using System;
using System.IO;
using System.Linq;

namespace CloudFiles.Utilities
{
    public static class CommonUtility
    {
        public static Stream GenerateStreamFromString(string s)
        {
            var stream = new MemoryStream();
            var writer = new StreamWriter(stream);
            writer.Write(s);
            writer.Flush();
            stream.Position = 0;
            return stream;
        }

        public static UiErrorFormat FormatErrorMessage(string message)
        {
            return new UiErrorFormat()
            {
                Message = message
            };
        }
        public static string GetTokenFromHeaders(HttpRequest req)
        {
            var success = req.Headers.TryGetValue("Authorization", out StringValues values);
            if (!success || values.Count == 0 || String.IsNullOrEmpty(values.FirstOrDefault()) || values.FirstOrDefault().Length < 20)
            {
                throw new UnauthorizedAccessException("Please include Authorization header with bearer token");
            }
            return values.FirstOrDefault()?.Replace("Bearer ", "").Replace("bearer ", "");
        }
    }

    public class UiErrorFormat {
        public string Message { get; set; }
    }
}
