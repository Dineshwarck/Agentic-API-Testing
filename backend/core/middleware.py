class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Log every incoming request
        print(f"\n>>> INCOMING REQUEST: {request.method} {request.path}")
        print(f">>> Headers: {dict(request.headers)}")
        
        response = self.get_response(request)
        
        print(f"<<< RESPONSE: {response.status_code}")
        return response
