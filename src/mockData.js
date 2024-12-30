export const mockResponse = {
    data: [
      {
        treeInfo: { key: "namu" },
        contents: {},
        children: [
          {
            treeInfo: {},
            contents: {},
            children: [
              {
                treeInfo: {},
                contents: {},
                children: [
                  {
                    treeInfo: {},
                    contents: {
                      codeValue: "\"cpu\":2,\"gpu\":0,\"mem\":16",
                      messageDefault: "C.Half(2*16)"
                    },
                    children: []
                  },
                  {
                    treeInfo: {},
                    contents: {
                      codeValue: "\"cpu\":2,\"gpu\":0,\"mem\":8",
                      messageDefault: "E.Basic"
                    },
                    children: []
                  },
                  {
                    treeInfo: {},
                    contents: {
                      codeValue: "\"cpu\":8,\"gpu\":1,\"mem\":64,\"gpu_physical\":\"20G\",\"gpu_type\":\"mig-2g.20gb\"",
                      messageDefault: "H.Standard(8*64)"
                    },
                    children: []
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  };