export type ParsedInstagramExport = {
  following: string[];
  followers: string[];
};

export type NonFollowerBack = {
  username: string;
  profileUrl: string;
};

export type AnalyzeResult = {
  stats: {
    following: number;
    followers: number;
    nonFollowersBack: number;
  };
  nonFollowersBack: NonFollowerBack[];
};
