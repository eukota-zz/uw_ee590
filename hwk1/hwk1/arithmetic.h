#pragma once
namespace dmath
{
	extern unsigned int RUN_COUNT;

	// ADD C
	void add(float* matrixA, float* matrixB, float* matrixC, size_t width, size_t height);

	// ADD C++
	void add(const std::vector<float>& pA, const std::vector<float>& pB, std::vector<float>* pC);

	// SAXPY 1D C
	void saxpy_1d(float pA, float* pX, float* pY, float* pZ, size_t width);

	// SAXPY 1D C++
	void saxpy_1d(float pA, const std::vector<float>& pX, const std::vector<float>& pY, std::vector<float>* pZ);

	// SAXPY 2D C
	void saxpy_2d(float* pA, float* pX, float* pY, float* pZ, size_t width, size_t height);

	// SAXPY 2D C++
	void saxpy_2d(const std::vector<float>& pA, const std::vector<float>& pX, const std::vector<float>& pY, size_t M, size_t N, std::vector<float>* pZ);
}