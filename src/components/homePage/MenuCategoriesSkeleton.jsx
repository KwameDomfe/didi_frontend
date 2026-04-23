import React from 'react';

const MenuCategoriesSkeleton = () => (
  <div className="mt-5">
    <h2 className="placeholder-glow"><span className="placeholder col-4"></span></h2>
    <p className="text-muted placeholder-glow"><span className="placeholder col-6"></span></p>
    {[...Array(2)].map((_, i) => (
      <div className="mb-4" key={i}>
        <h4 className="mb-3 placeholder-glow"><span className="placeholder col-3"></span></h4>
        <div className="row">
          {[...Array(4)].map((_, j) => (
            <div className="col-md-4 col-lg-2 mb-3" key={j}>
              <div className="card h-100 shadow-sm text-center">
                <div className="card-body placeholder-glow">
                  <span className="placeholder col-8 mb-2" style={{display:'block',height:'1.5rem'}}></span>
                  <span className="placeholder col-6"></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default MenuCategoriesSkeleton;
