#pragma once
namespace dmath
{
	void add(const std::vector<float>& pA, const std::vector<float>& pB, std::vector<float>* pC);

	void add(float* matrixA, float* matrixB, float* matrixC, size_t width, size_t height);

	void saxpy_1d(float pA, float* pX, float* pY, float* pZ, size_t width);
		
	void saxpy_1d(float pA, const std::vector<float>& pX, const std::vector<float>& pY, std::vector<float>* pZ);

	void saxpy_2d(const std::vector<std::vector<float> >& pA, const std::vector<std::vector<float> >& pX, const std::vector<std::vector<float> >& pY, std::vector<std::vector<float> >* pZ);
	
	void saxpy_2d(float* pA, float* pX, float* pY, float* pZ, size_t width, size_t height);
}