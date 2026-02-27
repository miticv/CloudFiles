using System;
using System.Collections.Generic;
using System.Text;

namespace CloudFiles.Models.Google
{
    public class GoogleItemPrepared: ItemPrepared
    {
        public GoogleItemPrepared() { }

        public string MediaLInk { get; set; }

        public GoogleItemPrepared(GoogleItem item, string accessToken, string albumId): base(item, accessToken, albumId)
        {
            MediaLInk = item.MedialLink;
            ContentType = item.ContentType;
        }
    }
}
