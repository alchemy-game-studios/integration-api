/*
 * Factory to create test data examples.
 */
export class ExampleFactory {
  readonly defaultStatus: number = 200;
  readonly defaultResultsPerPage: number = 100;

  githubPaginatedResultSet(numPages: number, numPerPage: number = this.defaultResultsPerPage) {
    const resultSet = [];

    for (let i = 0; i < numPages; i++) {
      const links = [
        {
          perPage: numPerPage,
          pageNumber: i,
          page: i + 1,
          rel: 'next',
        },
        {
          perPage: numPerPage,
          pageNumber: numPages,
          page: numPages,
          rel: 'last',
        },
      ];

      resultSet.push(this.githubPaginatedResult(this.defaultStatus, numPerPage, links));
    }

    return resultSet;
  }

  githubDerivedResult(numPullRequests: number) {
    const links = [
      {
        perPage: 1,
        page: 1,
        pageNumber: 1,
        rel: 'next',
      },
      {
        perPage: 1,
        pageNumber: 1,
        page: numPullRequests,
        rel: 'last',
      },
    ];
    return this.githubPaginatedResult(this.defaultStatus, 1, links);
  }

  githubSearchResult(numPullRequests: number) {
    return {
      status: this.defaultStatus,
      data: {
        total_count: numPullRequests,
      },
    };
  }

  githubPaginatedResult(status: number, numDataPerPage: number, links: any[] = null, headers: any = {}) {
    const example: any = {
      status: status,
      headers: headers,
      data: [],
    };

    if (!links) {
      links = [
        {
          perPage: 1,
          page: 1,
          pageNumber: 1,
          rel: 'next',
        },
        {
          perPage: 1,
          pageNumber: 1,
          page: 1,
          rel: 'last',
        },
      ];
    }

    // Set up data
    for (let i = 0; i < numDataPerPage; i++) {
      example.data.push(this.dataExample());
    }

    //  Set up pagination data
    if (links.length > 0) {
      let linkString = '';
      for (let i = 0; i < links.length; i++) {
        linkString += this.paginatedLinkExample(links[i].perPage, links[i].page, links[i].rel);

        if (i < links.length - 1) {
          linkString += ',';
        }
      }

      example.headers.link = linkString;
    }

    return example;
  }

  githubNonPaginatedResult(status: number, numData: number) {
    return this.githubPaginatedResult(status, numData);
  }

  paginatedLinkExample(perPage: number, page: number, rel: string = 'next') {
    return `<https://api.github.com/repositories/3955647/pulls?state=all&per_page=${perPage}&page=${page}&pageNumber=${page}>; rel="${rel}"`;
  }

  dataExample() {
    return {};
  }
}
