export type LayerDetail = {
  theory: string;
  implementation: string;
};

export type AttentionModelRow = {
  id: string; // This will be the YouTube ID
  attention: LayerDetail;
  engagement: LayerDetail;
  persuasion: LayerDetail;
  retention: LayerDetail;
  action: LayerDetail;
};
