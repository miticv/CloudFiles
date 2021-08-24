using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Text;

namespace AdaFile.Utilities
{
    public static class ErrorUtility
    {
        public static UiErrorFormat FormatErrorMessage(string message)
        {
            return new UiErrorFormat() {
                Message = message
            };
        }
    }

    public class UiErrorFormat {
        public string Message { get; set; }
    }
}
