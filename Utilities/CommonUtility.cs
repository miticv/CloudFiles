using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;
using System;
using System.IO;
using System.Linq;

namespace CloudFiles.Utilities
{
    public static class CommonUtility
    {
        public static string GetItemNameFromPath(this string value) {
            return value.Trim('/').Split('/').Last();
        }

        public static string GetItemTypeFromPath(this string value)
        {
            return value.EndsWith("/") ? "FOLDER" : value.Trim('/').Split('/').Last().Split('.').Last().ToUpper();
        }

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

        public static string ToFileSize(this double value)
        {
            string[] suffixes = { "bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"};
            for (int i = 0; i < suffixes.Length; i++)
            {
                if (value <= (Math.Pow(1024, i + 1)))
                {
                    return ThreeNonZeroDigits(value /
                        Math.Pow(1024, i)) +
                        " " + suffixes[i];
                }
            }

            return ThreeNonZeroDigits(value /
                Math.Pow(1024, suffixes.Length - 1)) +
                " " + suffixes[^1]; // suffixes[suffixes.Length - 1]
        }
        private static string ThreeNonZeroDigits(double value)
        {
            if (value >= 100)
            {
                // No digits after the decimal.
                return value.ToString("0,0");
            }
            else if (value >= 10)
            {
                // One digit after the decimal.
                return value.ToString("0.0");
            }
            else
            {
                // Two digits after the decimal.
                return value.ToString("0.00");
            }
        }
    }

    public class UiErrorFormat {
        public string Message { get; set; }
    }
}
