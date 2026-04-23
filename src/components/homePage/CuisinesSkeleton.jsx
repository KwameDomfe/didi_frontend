const CuisinesSkeleton = () => (
  <div className="mt-5">
    <h2 className="placeholder-glow"><span className="placeholder col-4"></span></h2>
    <p className="text-muted placeholder-glow"><span className="placeholder col-6"></span></p>
    <div className="row">
      {[...Array(6)].map((_, idx) => (
        <div className="col-md-4 col-lg-2 mb-3" key={idx}>
          <div className="card h-100 shadow-sm text-center">
            <div className="card-body placeholder-glow">
              <span className="placeholder col-8 mb-2" style={{display:'block',height:'2rem'}}></span>
              <span className="placeholder col-6"></span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default CuisinesSkeleton;
