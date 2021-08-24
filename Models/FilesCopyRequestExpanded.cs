using System.Collections.Generic;

namespace AdaFile.Models
{
    public class FilesCopyRequestExpanded : FilesCopyRequest
    {
        public FilesCopyRequestExpanded(FilesCopyRequest request, List<Item> expandedList) {
            AccessToken = request.AccessToken;
            AlbumId = request.AlbumId;
            CreationDateTime = request.CreationDateTime;
            SelectedItemsList = request.SelectedItemsList;
            ExpandedItemsList = new List<ItemExpanded>();

            foreach (var item in expandedList) {
                ExpandedItemsList.Add(new ItemExpanded(item, request.AccessToken, request.AlbumId));
            }
        }

        public List<ItemExpanded> ExpandedItemsList { get; set; }
    }
}
