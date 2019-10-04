class Record:

    def __init__(self, archive_number: str,
                 category: str,
                 year_of_publication: str,
                 name: str,
                 authors: str,
                 other: str,
                 number_citations: str,
                 citation_records: list,
                 keywords: list):
        self.archive_number = archive_number
        self.category = category
        self.year_of_publication = year_of_publication
        self.name = name
        self.other = other
        self.authors = authors
        self.number_citations = number_citations
        self.citation_records = citation_records
        self.keywords = keywords
