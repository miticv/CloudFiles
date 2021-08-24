using System;
using System.Collections.Generic;
using System.Text;

namespace AdaFile.Models
{
    public class ItemExpanded
    {
        public ItemExpanded(Item item, string accessToken, string albumId)
        {
            ItemPath = item.ItemPath;
            // ItemFilename = item.ItemPath
            CreationDateTime = item.CreationDateTime;
            AccessToken = accessToken;
            AlbumId = albumId;
        }

        public string ItemId { get; set; }
        public string ItemPath { get; set; }
        public string ItemFilename { get; set; }
        public DateTime? CreationDateTime { get; set; }
        public string AccessToken { get; set; }

        public string AlbumId { get; set; }
        public string UploadToken { get; set; }
        public bool CopiedToAlbum { get; set; }
        public string StatusMessage { get; set; }
    }
}
