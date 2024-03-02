export namespace ImgBB {
  /** The form data for deleting an image. */
  interface ImageDelete {
    /** The API key of the ImgBB. */
    auth_token: string;
    action: "delete";
    delete: string;

    from?: string;
    owner?: string;

    deleting: {
      id: string;
      hash: string;
      type?: string;
      url?: string;
      privacy?: string;
      parent_url?: string;
    };
  }
}
