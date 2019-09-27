class Record:

    def __init__(self, archive_number: str, category: str, year_of_publication: str, name: str, author: str,
                 responsibilities: str,
                 citations: str):
        self.archive_number = archive_number
        self.category = category
        self.year_of_publication = year_of_publication
        self.name = name
        self.author = author
        self.responsibilities = responsibilities
        self.citations = citations
