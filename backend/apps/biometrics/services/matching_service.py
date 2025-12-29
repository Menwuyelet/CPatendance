## the matching service will call an AI service to match the captured embedding with stored embeddings in db encrypted from biometric profile
## by loading and decrypting them first and then call the ai for getting reading embedding and iterate through them to find a match by calculating cosine similarity
class BiometricMatchingService:
    ## Write the logic to feed the stored embedidings depending on the shift
    @staticmethod
    def match_face(embedding):
        ## ai call for face embedding matching
        # Placeholder implementation: return the first matching employee_id or None
        # for employee_id, stored_embedding in stored_embeddings.items():
        #     if BiometricMatchingService._is_match(embedding, stored_embedding):
        #         return employee_id
        # return None
        stored_embeddings = {1: [1, 2, 4], 2: [5, 6, 7]}  # Simulated stored embeddings which would be done by calling a method to filter embeddings by shift
        for employee_id, stored_embedding in stored_embeddings.items():
            if BiometricMatchingService._is_match(embedding, stored_embedding):
                return employee_id
        return None
        
        
    @staticmethod
    def _is_match(embedding1, embedding2, threshold=0.6):
        # Placeholder for actual matching logic, e.g., cosine similarity
        # distance = sum((a - b) ** 2 for a, b in zip(embedding1, embedding2)) ** 0.5
        # return distance < threshold
        return embedding1 == embedding2